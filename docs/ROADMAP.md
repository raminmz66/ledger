# Roadmap: دفتر حساب سیمرغ

Spec: [docs/superpowers/specs/2026-10-06-simorgh-ledger-design.md](superpowers/specs/2026-10-06-simorgh-ledger-design.md) (§12 has the "done when" criteria).

- [x] **M0 Design**: spec, mockups, icon, tracking files
- [x] **M1 Skeleton**: public repo, Worker + static assets, D1 migration, RTL shell, tokens, icons, manifest, first deploy
- [x] **M2 Auth**: email code via Resend, rate limits, sessions, login screens, cron cleanup
- [ ] **M3 Data**: people + transactions API and forms (add/edit/delete, Jalali date, note)
- [ ] **M4 Overviews**: home totals + people list, person page with balance and grouped history
- [ ] **M5 Polish**: empty/error states, toasts, copy lint, README deploy guide, phone smoke test, tag v1

Each milestone: spec → implementation plan (`docs/superpowers/plans/`) → branch → tests → merge → STATUS.md update.
