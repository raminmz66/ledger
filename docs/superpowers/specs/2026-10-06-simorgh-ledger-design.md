# دفتر حساب سیمرغ: v1 design

Status: **approved in brainstorming 2026-10-06, awaiting written-spec review**
Mockups: [`docs/mockups/`](../../mockups/) · Icon source: [`docs/design/icon.svg`](../../design/icon.svg)
Reference project: [raminmz66/personal-asset-tracker](https://github.com/raminmz66/personal-asset-tracker) (PAT)

## 1. Intent

A tiny Persian, RTL, mobile-first PWA for keeping track of money given to and received from people (friends, family, acquaintances). It replaces memory: "how much does Ali owe me?", "what did I pay Maryam last month?".

Success = on a phone, a user can sign in with only their email, add a person, record «پرداخت کردم» / «دریافت کردم» with a Jalali date in a few taps, and see each person's net balance and history.

### Decisions (from the user)

| Topic | Decision |
|---|---|
| Users | Multi-user. Email + one-time code; first sign-in creates the account. No passwords, no 2FA. |
| Currency | Toman only, integer amounts. |
| Offline | Online only. Installable PWA shell, no cached data, no write queue. |
| Email | Resend, sent from the user's own domain. |
| v1 extras | Edit/delete transactions, optional note per transaction. |
| Not in v1 | Search, archiving settled people, multi-currency, export/import, reports, sharing a ledger with the other person. |
| Name | «دفتر حساب سیمرغ»; home-screen short name «سیمرغ»; repo `raminmz66/ledger` (public). |
| Look | PAT's "Calm notebook" UI, reused. Icon: Simorgh feather (option B). |
| Persian copy | Must follow the `persian-writing` skill (vendored at `.claude/skills/persian-writing`). |

## 2. Architecture

One Cloudflare Worker serves the built React app as static assets and the Hono API under `/api/*`. One D1 database. One `wrangler.jsonc`, one deploy command.

```
src/worker/     Hono app: routes, auth, rate limits, D1 queries, Resend client
src/client/     React 19 + Vite PWA (react-router)
migrations/     D1 SQL migrations
public/         icons, manifest assets
docs/           spec, mockups, ROADMAP.md, STATUS.md
```

Single `package.json` (no workspaces). Vite builds the client into `dist/`; `wrangler.jsonc` sets `assets.directory = ./dist` with `not_found_handling: "single-page-application"` and `run_worker_first: ["/api/*"]`.

### Reused from PAT (copied, then trimmed)

- `components/JalaliDateField`, `AmountField`, `SegmentedControl`, `BackButton`, `ConfirmPress`
- `dates/jalali.ts`, `dates/relative-fa.ts`, `format/digits.ts` (+ their tests)
- `styles/tokens.css`, `styles/global.css`, `@fontsource/vazirmatn` + `@fontsource/lalezar`, `dayjs` + `jalaliday`
- `vite-plugin-pwa` setup, iOS safe-area handling, manifest structure

### Not carried over

Offline outbox/snapshot cache/SyncBanner, TOTP and QR code, the balances layer, `packages/domain`, PDF reports, backup import/export, Pages Function proxy.

## 3. Data model (D1)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,          -- lowercased, trimmed
  created_at TEXT NOT NULL
);

CREATE TABLE people (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('paid', 'received')),
  amount INTEGER NOT NULL CHECK (amount > 0),   -- Toman
  date TEXT NOT NULL,                           -- Gregorian 'YYYY-MM-DD'
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE login_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at TEXT NOT NULL
);

CREATE INDEX idx_people_user ON people(user_id);
CREATE INDEX idx_tx_person ON transactions(person_id, date);
```

- IDs: `crypto.randomUUID()`. Timestamps: ISO UTC strings.
- Dates are stored Gregorian and converted to Jalali only in the client.
- **Balance** of a person = `SUM(paid) − SUM(received)`.
  - `> 0` → «از او طلب دارم» (they owe me), teal
  - `< 0` → «به او بدهکارم» (I owe them), red
  - `= 0` → «تسویه», muted
- **Home totals:** «طلب من» = sum of positive balances; «بدهی من» = sum of |negative balances|.
- Every query filters by the session's `user_id`; a person or transaction from another user returns 404.

## 4. Auth and rate limiting

### Flow

1. `POST /api/auth/request-code {email}`: normalize email (trim, lowercase, ≤254 chars, basic shape check). Check rate limits. Generate a 6-digit code (`crypto.getRandomValues`), store `HMAC-SHA256(SESSION_SECRET, email + ":" + code)` with 10-minute expiry and `attempts = 0` (replacing any previous code), send it via Resend. The response is always `204` for valid input whether or not the account exists; `429` with `retryAfter` seconds when limited.
2. `POST /api/auth/verify {email, code}`: the code accepts Persian or Latin digits (normalized server-side). On mismatch, increment `attempts`; at 5 the code is deleted. On success, delete the code, create the user if missing, create a session: 32 random bytes (base64url) as the cookie value, `SHA-256(token)` stored in `sessions`, 30-day expiry. Cookie `sid`: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`.
3. `POST /api/auth/logout`: delete the session row, clear the cookie.
4. `requireAuth` middleware on everything else: look up `SHA-256(cookie)`, reject expired → `401`.

### Limits (fixed windows in `rate_limits`)

| Key | Limit | On exceed |
|---|---|---|
| `send:email:<email>` | 1 per 60 s | 429 + seconds left |
| `sendh:email:<email>` | 5 per hour | 429 |
| `send:ip:<ip>` | 20 per hour | 429 |
| code `attempts` | 5 wrong tries | code deleted, must request a new one |
| `fail:ip:<ip>` | 30 failed verifies per hour | 429 on further verifies |

IP comes from `CF-Connecting-IP`. A daily Cron trigger deletes expired `login_codes`, `sessions` and `rate_limits` rows.

### Email

- Sender `EMAIL_FROM` (e.g. `سیمرغ <noreply@your-domain>`), via Resend HTTP API with `RESEND_API_KEY`.
- RTL HTML email with inline styles (Tahoma stack, `dir="rtl"` on every block), plus a plain-text part.
- The code is shown in **Latin digits** in the email so phones can autofill and copy it cleanly (the persian-writing skill keeps codes in Latin digits).
- Subject: «کد ورود به سیمرغ: 481209».
- In dev (`EMAIL_DEV_LOG=1`) the code is logged to the console instead of sent.

## 5. API

All JSON; errors are `{ "error": "<code>" }` with a matching HTTP status. The client maps error codes to Persian messages.

| Method | Path | Body / result |
|---|---|---|
| POST | `/api/auth/request-code` | `{email}` → 204 · 400 `invalid_email` · 429 `{retryAfter}` |
| POST | `/api/auth/verify` | `{email, code}` → 200 `{email}` + cookie · 400 `wrong_code {attemptsLeft}` · 400 `code_expired` · 429 |
| POST | `/api/auth/logout` | → 204 |
| GET | `/api/me` | → `{email}` · 401 |
| GET | `/api/people` | → `{totals: {owedToMe, iOwe}, people: [{id, name, balance, lastActivity}]}` sorted by `lastActivity` desc |
| POST | `/api/people` | `{name}` → 201 `{id, name}` |
| PATCH | `/api/people/:id` | `{name}` → 200 |
| DELETE | `/api/people/:id` | → 204 (cascades transactions) |
| GET | `/api/people/:id` | → `{id, name, balance, transactions: [{id, direction, amount, date, note}]}` newest first |
| POST | `/api/people/:id/transactions` | `{direction, amount, date, note?}` → 201 |
| PATCH | `/api/transactions/:id` | same fields → 200 |
| DELETE | `/api/transactions/:id` | → 204 |

`lastActivity` = the latest transaction `created_at`, else the person's `created_at`.

### Validation (server; mirrored in the client)

- `name`: trimmed, 1–60 chars. Duplicates allowed.
- `amount`: integer, 1 to 1,000,000,000,000 Toman.
- `date`: valid `YYYY-MM-DD`. Future dates allowed.
- `note`: optional, trimmed, ≤200 chars, empty → `null`.
- Persian/Arabic digits normalized to Latin before parsing; Arabic «ي/ك» normalized to «ی/ک» in names and notes.

## 6. Screens and flow

Mockups: `docs/mockups/flow-and-screens.html` (screens 1–5), `secondary-screens.html` (6–10), `icon-options.html`.

```
ورود (ایمیل) → کد تأیید → خانه ─┬→ صفحه‌ی شخص → فرم تراکنش (افزودن / ویرایش)
                              ├→ شخص جدید (sheet) → صفحه‌ی شخص
                              └→ تنظیمات → خروج
```

| # | Screen | Route | Behavior |
|---|---|---|---|
| 1 | Sign in | `/login` | Email field (`dir=ltr`, `inputmode=email`), «ارسال کد ورود». Notice that a first sign-in creates the account. |
| 2 | Code | `/login` (step 2) | 6 boxes, `inputmode=numeric`, `autocomplete=one-time-code`, paste fills all boxes, auto-submits at 6 digits. 60 s resend countdown. «تغییر ایمیل» goes back. Inline errors. |
| 3 | Home | `/` | Header with wordmark + ⚙. Two totals cards. People list: name + colored balance label. FAB «+ شخص جدید». Empty state invites adding the first person. |
| 4 | Person | `/people/:id` | Back, name, ⋯ menu. Large balance with words above. Buttons «پرداخت کردم» (filled) / «دریافت کردم» (outlined). History grouped by Jalali date, newest first; row = direction · note, signed amount. Tap row → edit. |
| 5 | Transaction form | bottom sheet | Segmented direction (preset from the tapped button). Amount with numeric keypad, thousands separators and amount in words below. Date chips «امروز» / «دیروز» / «انتخاب تاریخ». Optional note. «ذخیره». |
| 6 | Jalali calendar | sheet | PAT `JalaliDateField` restyled as a sheet: Saturday-first, today outlined, one tap picks and closes, «امروز» shortcut. |
| 7 | Add person | sheet | Name only, «افزودن», then navigate to the new person. |
| 8 | Person menu | popover | «تغییر نام» (sheet with name), «حذف شخص» (tap-twice confirm naming the transaction count). |
| 9 | Edit transaction | sheet | Same form pre-filled; «ذخیره‌ی تغییرات» and «حذف تراکنش» (tap-twice). |
| 10 | Settings | `/settings` | Email, «خروج از حساب», version line. |

Interaction rules:
- Destructive actions use PAT `ConfirmPress` (first tap arms for 3 s and turns red, second tap confirms). No browser dialogs.
- After saving, the sheet closes and the list refreshes; a short toast «ذخیره شد».
- Any `401` sends the user to `/login`.
- Network failure: inline message «اتصال برقرار نیست. دوباره امتحان کنید.» and the form keeps its values.
- Tap targets ≥ 44px; inputs ≥ 16px (no iOS zoom); layout max-width 480px, centered on desktop.

## 7. Identity and PWA

- `name`: «دفتر حساب سیمرغ», `short_name`: «سیمرغ», `lang: fa`, `dir: rtl`, `display: standalone`, `start_url: /`.
- Colors: theme `#0f6b6b`, background `#f4efe6`, ink `#3d3428`, danger `#8b3a2f`, accent gold `#d9a441` (icon only).
- Fonts: Vazirmatn (UI), Lalezar (wordmark and big titles only), self-hosted via `@fontsource`, Arabic subset only.
- Icon: `docs/design/icon.svg` (feather). Generated in M1: `favicon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (feather scaled into the 80% safe zone on full-bleed teal), `apple-touch-icon.png` (180, no rounded corners).
- Service worker: precache the app shell only; `/api/*` is network-only.

## 8. Persian copy

- All UI text, emails and docs aimed at users follow `.claude/skills/persian-writing`: register is formal-but-human (written forms, no slang, «است» not «می‌باشد»), ZWNJ, «ی/ک», Persian digits in text, «،؛؟», «گیومه», no em dashes, no line starting with a Latin word.
- Numbers in the UI: Persian digits with «٬» thousands separator. Codes and emails stay Latin and `dir=ltr`.
- All strings live in one file, `src/client/copy.ts`, which is checked with the skill's `fa_lint.py` before each milestone ends.

## 9. Testing

- **Vitest unit tests:** rate-limit window logic, code hashing/verification, email normalization, digit normalization, input validation, balance/totals calculation, Jalali helpers (reused from PAT).
- **Worker integration:** `@cloudflare/vitest-pool-workers` against local D1 for the auth flow (request → verify → session → logout) and user isolation (user B cannot read or change user A's people).
- **Client:** Testing Library for the code input (paste, auto-submit), transaction form validation and `ConfirmPress`.
- **Manual smoke on a real phone** at the end of M2, M4 and M5 (checklist kept in `docs/STATUS.md`).

## 10. Deployment

- Cloudflare Worker `simorgh-ledger` with static assets, D1 `simorgh-db`, daily Cron trigger.
- Secrets: `SESSION_SECRET`, `RESEND_API_KEY`. Vars: `EMAIL_FROM`.
- Custom domain on the user's Cloudflare zone (needed for Resend's DNS records); `*.workers.dev` works until then.
- `npm run deploy` = build client + `wrangler deploy`; migrations via `wrangler d1 migrations apply simorgh-db --remote`.
- Git: public repo `raminmz66/ledger`, `main` branch; one branch per milestone merged when its checks pass.

## 11. Progress tracking

- `CLAUDE.md` (repo root): tells every new session to read `docs/STATUS.md` first, and points to this spec, the roadmap and the persian-writing skill.
- `docs/ROADMAP.md`: milestones with checkboxes.
- `docs/STATUS.md`: current milestone, last finished task, the exact next step, open questions/blockers, and a dated log. Updated at the end of every task and committed with it.

## 12. Roadmap

| Milestone | Scope | Done when |
|---|---|---|
| M0 Design | This spec, mockups, icon, tracking files | User approves the spec |
| M1 Skeleton | Public repo, Worker + assets, D1 migration, Vazirmatn/RTL shell, tokens, icons, manifest, first deploy | Installable empty shell live on Cloudflare |
| M2 Auth | Email code, Resend, rate limits, sessions, login screens, cron cleanup | Sign in/out works on a phone; limits tested |
| M3 Data | People + transactions API and forms (add/edit/delete, Jalali date, note) | CRUD works end to end with user isolation tests |
| M4 Overviews | Home totals + list, person page with balance and grouped history | Matches mockups 3–4 on a phone |
| M5 Polish | Empty/error states, toasts, install hints, copy lint, README deploy guide, phone smoke test | v1 tagged |

## 13. Open items (do not block the spec)

- The sending domain and whether it is already on Cloudflare; Resend account + API key. Needed in M2; M1 deploys on `workers.dev`.
