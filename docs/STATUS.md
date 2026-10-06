# Status

**Current milestone:** M5 Polish (not started)
**Last done:** M4 Screens merged and deployed (293 tests): home, person page, sheets, Jalali calendar, edit/delete flows (2026-10-06)
**Next step:** write the M5 plan (superpowers:writing-plans). Scope from the M4 review: Sheet a11y (focus trap or `inert` on `.app-shell`, `overscroll-behavior: contain`, optional returnFocus ref, tests for focus return across stacked sheets); keep form drafts across `auth:expired` (sessionStorage) and return to the original route after login; Toast persistent live region + error variant; shared `types.ts` for API shapes (`Tx`, `PersonDetail`, `PeopleList`), widen `errorMessage` signature, drop casts; real-device pass notes (iOS keyboard over sheets/dvh, safe areas, `:has()` fallback); SW update prompt instead of silent autoUpdate; optional copy pass (تسویه wording); README deploy guide; final copy lint; v1 tag.

## Resources

- Worker `simorgh-ledger`, D1 `simorgh-db` (id in wrangler.jsonc), secrets `SESSION_SECRET` and `RESEND_API_KEY` already set on the Worker.
- Local secrets in gitignored `.dev.vars` (SESSION_SECRET, RESEND_API_KEY, EMAIL_FROM).
- Email: sender `onboarding@resend.dev`, which only delivers to ramin.mz66@gmail.com until a domain is verified in Resend.
- Rotate the Resend key when v1 is done: create a new key in Resend, then `npx wrangler secret put RESEND_API_KEY` and update `.dev.vars`.

## Open questions / blockers

- Phone smoke test (user, M3+M4): open the live URL, add a person, add «پرداخت کردم» with a calendar date, add «دریافت کردم», edit a transaction, delete one (second tap), rename, delete the person, check totals on Home; check the calendar's month arrows (next on the left), the toast at the top, the keyboard over the transaction sheet, and install the PWA.

- Sending domain for other users (not blocking v1 development).
- (done 2026-10-06, user confirmed ✅) Phone smoke test (M1+M2): open https://simorgh-ledger.bartaran.workers.dev on the phone; sign in with ramin.mz66@gmail.com (the email must arrive; paste or autofill the code); check Settings and sign-out; "Add to Home Screen" and confirm icon, name «سیمرغ», RTL and Vazirmatn font. Note: only that address can receive codes until a domain is verified in Resend (other addresses get `email_failed`).

## Deferred minors

- package.json cleanup (private as boolean, npm init leftovers); `Env.ASSETS` declared without a binding.
- PAT's jalali test expects 10 Mordad for 2025-07-31; the correct date is 9 Mordad (our copy is fixed; tell the PAT owner).
- SW `autoUpdate` may reload mid-form: switch to a prompt-style update in M3/M5.
- icons.mjs regex is fragile if the SVG gains nested groups.

- M2 deferred: db.ts splits migrations on ';'; parallel-guess test could add a variant with the right code mid-burst; validate.ts invisible chars are literal.

- M3 deferred: id tie-break sort tests; year range check (0100–9999 accepted); stale 401 after fresh login could sign out (tiny window).

## Log

- 2026-10-06: M0 design done. M1 built via subagent-driven plan (5 tasks, all reviewed), deployed to workers.dev.
- 2026-10-06: M2 built (7 tasks, opus security review found and fixed a concurrent-guess bypass and login CSRF), deployed. EMAIL_FROM lives in wrangler.jsonc vars; secrets SESSION_SECRET/RESEND_API_KEY on the Worker. Live check: owner email request-code 204.
- 2026-10-06: M3 done: 4 tasks batched, one opus whole-branch review found only weak sort tests + hardening (fixed). Live: /api/people 401 anon, health 200.
- 2026-10-06: M4 done: 5 tasks, headless-browser QA (24 screenshots) fixed RTL calendar arrows/amount focus/LTR signs/toast, opus whole-branch review fixed delete double-submit, stale-response hook, bdi isolation, silent refetch errors. Deployed.
