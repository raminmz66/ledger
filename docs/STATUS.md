# Status

**Current milestone:** v1 shipped (M0–M5 done)
**Last done:** M5 Polish merged, deployed and tagged `v1.0.0` (2026-10-06). Live: https://simorgh-ledger.bartaran.workers.dev
**Next step:** nothing is queued. Pick from "Wishes" below when the owner decides.

## What exists

- Worker `simorgh-ledger` (Hono API + static React build), D1 `simorgh-db`, daily cron cleanup, Resend email.
- 346 tests (Worker with Miniflare D1, client with Testing Library). Spec: `docs/superpowers/specs/`, plans: `docs/superpowers/plans/`, mockups: `docs/mockups/`.
- Secrets on the Worker: `SESSION_SECRET`, `RESEND_API_KEY`. `EMAIL_FROM` is a var in `wrangler.jsonc`. Local secrets live in gitignored `.dev.vars`.

## Owner to-do (needs the owner, not code)

- **Real-device pass** on the phone: add people and both kinds of transactions with the calendar, edit, delete (second tap), rename, delete a person, check totals on Home; calendar month arrows (next on the left); keyboard over the transaction sheet; toast; install to the home screen. Note: a phone still running the pre-v1 build gets this version only after the app is fully closed once.
- **Sending domain:** until a domain is verified in Resend, only ramin.mz66@gmail.com can receive login codes (other addresses get `email_failed`). Steps are in the README ("Email setup").
- **Rotate the Resend key** (it was pasted into the chat): create a new key in Resend, `npx wrangler secret put RESEND_API_KEY`, update `.dev.vars`, delete the old key.
- **License:** none chosen yet (README says all rights reserved).

## Wishes (not scheduled)

- Search people, archive settled people, export/backup, more currencies.
- Keep form drafts across `auth:expired` (sessionStorage).
- Real-device keyboard handling for sheets (`dvh`), `:has()` fallback for old WebViews.
- Cosmetic: toast overlaps the person name briefly at the top; amount field alignment; double shade when the calendar stacks over the transaction sheet.
- Deferred minors: test DB helper splits migrations on `;`; parallel-guess test could add a mid-burst variant; years 0100–9999 accepted by date validation; `/api/*` has no CSP header (JSON only).
- PAT (personal-asset-tracker) has a wrong date fixture in `jalali.test.ts` (expects 10 Mordad for 2025-07-31; correct is 9 Mordad).

## Log

- 2026-10-06: M0 design; M1 skeleton; M2 auth (opus security review fixed a concurrent-guess bypass and login CSRF); M3 data API; M4 screens (headless-browser QA fixed RTL arrows/focus/signs/toast); M5 polish (inert sheets, assertive toasts, update prompt, install hints, headers, README). All deployed; v1.0.0 tagged.
