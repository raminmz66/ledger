# Roadmap: دفتر حساب سیمرغ

Spec: [docs/superpowers/specs/2026-10-06-simorgh-ledger-design.md](superpowers/specs/2026-10-06-simorgh-ledger-design.md) (§12 has the "done when" criteria).

- [x] **M0 Design**: spec, mockups, icon, tracking files
- [x] **M1 Skeleton**: public repo, Worker + static assets, D1 migration, RTL shell, tokens, icons, manifest, first deploy
- [x] **M2 Auth**: email code via Resend, rate limits, sessions, login screens, cron cleanup
- [x] **M3 Data API**: people + transactions API, balances/totals, isolation tests, shared 401 handler
- [ ] **M4 Screens**: home list + totals, person page with grouped history, transaction/person sheets, Jalali calendar, edit/delete flows
- [ ] **M5 Polish**: empty/error states, toasts, copy lint, README deploy guide, phone smoke test, tag v1

Each milestone: spec → implementation plan (`docs/superpowers/plans/`) → branch → tests → merge → STATUS.md update.
