# Status

**Current milestone:** M3 Data (not started)
**Last done:** M2 Auth merged and deployed (115 tests): https://simorgh-ledger.bartaran.workers.dev (2026-10-06)
**Next step:** write the M3 plan (superpowers:writing-plans) from spec §3, §5 (people/transactions), §6 screens 3–9 (forms only; overviews are M4). Its Task 1 must add the shared 401 handler: in src/client/api.ts fire `auth:expired` on any 401 outside /api/me and /api/auth/*; AuthProvider listens and goes anon. Use `people.use('*', requireAuth)` and add a test that every non-auth /api/* route returns 401 without a cookie.

## Resources

- Worker `simorgh-ledger`, D1 `simorgh-db` (id in wrangler.jsonc), secrets `SESSION_SECRET` and `RESEND_API_KEY` already set on the Worker.
- Local secrets in gitignored `.dev.vars` (SESSION_SECRET, RESEND_API_KEY, EMAIL_FROM).
- Email: sender `onboarding@resend.dev`, which only delivers to ramin.mz66@gmail.com until a domain is verified in Resend.
- Rotate the Resend key when v1 is done: create a new key in Resend, then `npx wrangler secret put RESEND_API_KEY` and update `.dev.vars`.

## Open questions / blockers

- Sending domain for other users (not blocking v1 development).
- (done 2026-10-06, user confirmed ✅) Phone smoke test (M1+M2): open https://simorgh-ledger.bartaran.workers.dev on the phone; sign in with ramin.mz66@gmail.com (the email must arrive; paste or autofill the code); check Settings and sign-out; "Add to Home Screen" and confirm icon, name «سیمرغ», RTL and Vazirmatn font. Note: only that address can receive codes until a domain is verified in Resend (other addresses get `email_failed`).

## Deferred minors

- package.json cleanup (private as boolean, npm init leftovers); `Env.ASSETS` declared without a binding.
- PAT's jalali test expects 10 Mordad for 2025-07-31; the correct date is 9 Mordad (our copy is fixed; tell the PAT owner).
- SW `autoUpdate` may reload mid-form: switch to a prompt-style update in M3/M5.
- icons.mjs regex is fragile if the SVG gains nested groups.

- M2 deferred: db.ts splits migrations on ';'; parallel-guess test could add a variant with the right code mid-burst; validate.ts invisible chars are literal.

## Log

- 2026-10-06: M0 design done. M1 built via subagent-driven plan (5 tasks, all reviewed), deployed to workers.dev.
- 2026-10-06: M2 built (7 tasks, opus security review found and fixed a concurrent-guess bypass and login CSRF), deployed. EMAIL_FROM lives in wrangler.jsonc vars; secrets SESSION_SECRET/RESEND_API_KEY on the Worker. Live check: owner email request-code 204.
