# Status

**Current milestone:** M2 Auth (not started)
**Last done:** M1 Skeleton merged and deployed: https://simorgh-ledger.bartaran.workers.dev (2026-10-06)
**Next step:** write the M2 plan (superpowers:writing-plans) from spec §4, §5 (auth routes) and §6 screens 1–2, then execute it subagent-driven

## Resources

- Worker `simorgh-ledger`, D1 `simorgh-db` (id in wrangler.jsonc), secrets `SESSION_SECRET` and `RESEND_API_KEY` already set on the Worker.
- Local secrets in gitignored `.dev.vars` (SESSION_SECRET, RESEND_API_KEY, EMAIL_FROM).
- Email: sender `onboarding@resend.dev`, which only delivers to ramin.mz66@gmail.com until a domain is verified in Resend.
- Rotate the Resend key when v1 is done: create a new key in Resend, then `npx wrangler secret put RESEND_API_KEY` and update `.dev.vars`.

## Open questions / blockers

- Sending domain for other users (not blocking v1 development).
- Phone smoke test of the installed PWA (user): open the live URL, "Add to Home Screen", check icon/name «سیمرغ», RTL and font.

## Deferred minors

- package.json cleanup (private as boolean, npm init leftovers); `Env.ASSETS` declared without a binding.
- PAT's jalali test expects 10 Mordad for 2025-07-31; the correct date is 9 Mordad (our copy is fixed; tell the PAT owner).
- Move `afterEach(cleanup)` into test-setup.ts when more component tests arrive.
- SW `autoUpdate` may reload mid-form: switch to a prompt-style update in M3/M5.
- icons.mjs regex is fragile if the SVG gains nested groups.

## Log

- 2026-10-06: M0 design done. M1 built via subagent-driven plan (5 tasks, all reviewed), deployed to workers.dev.
