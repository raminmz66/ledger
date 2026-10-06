# دفتر حساب سیمرغ (Simorgh Ledger)

A Persian (RTL), mobile-first PWA for keeping track of money you paid to and received from people. You sign in with your email and a one-time code, add people, record transactions with Jalali dates, and see each person's balance and your totals.

- Live: https://simorgh-ledger.bartaran.workers.dev
- Status: v1 feature-complete. See [docs/STATUS.md](docs/STATUS.md).

## Features

- Sign in with email and a one-time code. No passwords; the first sign-in creates the account.
- People list with totals on the home screen.
- Per person: balance (طلب دارم / بدهکارم / تسویه), and transactions «پرداخت کردم» / «دریافت کردم».
- Jalali dates picked in a calendar sheet, optional note per transaction.
- Edit and delete transactions (tap twice to confirm delete).
- The amount is also written out in Persian words.
- Installable PWA with an update prompt. Online-only (no offline data).
- Rate limiting on login endpoints.
- RTL layout with the Vazirmatn font.

## Stack and architecture

One Cloudflare Worker (Hono) serves the React build as static assets and handles `/api/*`. Data lives in D1. A daily cron deletes expired codes, sessions and rate-limit rows. Login codes are sent through Resend.

```
Browser (React PWA)
   |  static files                |  /api/*
   v                              v
Cloudflare Worker "simorgh-ledger" (Hono, src/worker/index.ts)
   |-- assets binding: dist/ (SPA fallback; Worker runs first only for /api/*)
   |-- D1 "simorgh-db" (binding DB)
   |-- Resend HTTPS API (login code email)
   `-- cron 17 3 * * *  -> cleanupExpired()
```

| Path | Contents |
| --- | --- |
| `src/worker` | Hono app: `routes/` (auth, people, transactions), `middleware/`, `lib/` (crypto, rate limit, mail, validation, cleanup) |
| `src/client` | React app: routes, components, Jalali/number/words helpers, PWA update and install hooks, `copy.ts` (all UI text) |
| `migrations` | D1 schema (`0001_init.sql`) |
| `public` | Static files, including `_headers` (security headers and CSP) |
| `docs` | Status, roadmap, spec, plans, mockups, icon source |
| `.claude/skills/persian-writing` | Skill used for all Persian copy |

## API summary

All routes are under `/api`. Everything except `health`, `auth/request-code`, `auth/verify` and `auth/logout` requires a session cookie. Responses are `Cache-Control: no-store`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness check |
| POST | `/api/auth/request-code` | Email a 6-digit code (10 minutes validity) |
| POST | `/api/auth/verify` | Check the code, create the user if new, set the session cookie (30 days) |
| POST | `/api/auth/logout` | Delete the session |
| GET | `/api/me` | Current user's email |
| GET | `/api/people` | List people with totals |
| POST | `/api/people` | Add a person |
| GET | `/api/people/:id` | Person with balance and transactions |
| PATCH | `/api/people/:id` | Rename a person |
| DELETE | `/api/people/:id` | Delete a person and their transactions |
| POST | `/api/people/:id/transactions` | Add a transaction |
| PATCH | `/api/transactions/:id` | Edit a transaction |
| DELETE | `/api/transactions/:id` | Delete a transaction |

## Local development

Prerequisites: Node.js (24 works) and npm. No Cloudflare account is needed locally.

```sh
npm install
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply simorgh-db --local
npm run dev
```

`.dev.vars` is gitignored. Variables:

| Variable | Meaning |
| --- | --- |
| `SESSION_SECRET` | Secret key used to HMAC login codes. Any long random string locally. |
| `RESEND_API_KEY` | Resend API key. Not used when `EMAIL_DEV_LOG=1`. |
| `EMAIL_DEV_LOG` | `1` prints the login code to the dev server console instead of emailing it. Local only; never set in production. |
| `EMAIL_FROM` | Sender, e.g. `سیمرغ <onboarding@resend.dev>`. |

Dev login flow: open the app, enter any email, then read the code from the `[dev] login code for ...` line in the terminal running `npm run dev` and enter it.

Other commands:

```sh
npm test          # vitest
npx tsc -b        # type check
npm run build     # tsc -b && vite build
```

## Deployment to Cloudflare

1. Log in: `npx wrangler login`.
2. Create the database: `npx wrangler d1 create simorgh-db`, then put the returned `database_id` in `wrangler.jsonc` (`d1_databases[0].database_id`).
3. Apply migrations remotely: `npx wrangler d1 migrations apply simorgh-db --remote`.
4. Set secrets:
   ```sh
   openssl rand -base64 48 | npx wrangler secret put SESSION_SECRET
   npx wrangler secret put RESEND_API_KEY
   ```
5. Set `EMAIL_FROM` under `vars` in `wrangler.jsonc` (see Email setup).
6. Deploy: `npm run deploy` (builds, then `wrangler deploy`).
7. Verify (replace the host with your workers.dev URL):
   ```sh
   curl -i https://simorgh-ledger.bartaran.workers.dev/api/health   # 200 {"ok":true}
   curl -i https://simorgh-ledger.bartaran.workers.dev/api/people    # 401 when not signed in
   curl -I https://simorgh-ledger.bartaran.workers.dev/              # security headers present
   ```
   Then sign in from a browser and check that the code email arrives.

## Email setup (Resend)

1. Create a Resend account and an API key with "Sending access". Store it with `npx wrangler secret put RESEND_API_KEY` (and in `.dev.vars` for local use).
2. Until a domain is verified, use `onboarding@resend.dev` as sender. Resend delivers from it only to the email address of the Resend account owner; other addresses get `email_failed` (HTTP 502).
3. To send to anyone: get a domain (buy or add it to Cloudflare), add it in Resend, create the DNS records Resend shows, wait for verification, set `EMAIL_FROM` in `wrangler.jsonc` to an address on that domain (for example `سیمرغ <login@example.com>`), and redeploy.
4. Rotating the key: create a new key in Resend, run `npx wrangler secret put RESEND_API_KEY`, update `.dev.vars`, then delete the old key in Resend.

## Security notes

- Login codes are stored only as HMAC-SHA-256 of `email:code`, keyed with `SESSION_SECRET`; compared in constant time.
- Session tokens are random; only their SHA-256 is stored. The cookie is HttpOnly, Secure, SameSite=Lax, 30 days.
- Rate limits (stored in D1):

  | Limit | Scope |
  | --- | --- |
  | 1 code request per 60 s | per email |
  | 5 code requests per hour | per email |
  | 20 code requests per hour | per IP |
  | 30 failed verifications per hour | per IP |
  | 5 guesses per code, then the code is deleted | per code |

- Each verify attempt reserves a slot atomically (`UPDATE ... RETURNING`) before comparing, and a correct code is consumed atomically, so parallel guesses and replays do not bypass the limits.
- CSRF: Hono `csrf()` origin check on `/api/*`.
- Headers: static files get CSP and others from `public/_headers`; API responses get headers from Hono `secureHeaders`.
- Isolation: every query on people and transactions is scoped by `user_id`.
- No secrets in the repo: `.dev.vars` is gitignored; production secrets live in Worker secrets.

## Known limitations

- Online-only: no offline reading or queued writes.
- Update detection happens at launch/navigation. Users on the pre-v1 build get the new version only after fully closing the app once; afterwards a «نسخه‌ی تازه‌ای آماده است» banner appears.
- The install button shows only on Chromium browsers that fire `beforeinstallprompt`; iOS gets a manual "Add to Home Screen" hint.
- After re-login (expired session), the page to return to is kept in history state only.
- Sheets use `inert` for focus containment, which needs a modern browser (the focus trap still works without it).
- No sending domain is configured yet, so only the owner's address receives codes.
- No license has been chosen yet; all rights reserved until the owner picks one.
- Persian copy follows the `persian-writing` skill.

## Project process

- [docs/STATUS.md](docs/STATUS.md): where the project is, the exact next step, a log. Start every new session here (see [CLAUDE.md](CLAUDE.md)).
- [docs/ROADMAP.md](docs/ROADMAP.md): milestones.
- Spec: `docs/superpowers/specs/2026-10-06-simorgh-ledger-design.md`. Plans: `docs/superpowers/plans/`.
- Mockups: `docs/mockups/`. Icon source: `docs/design/icon.svg` (`npm run icons` regenerates the PNGs).
