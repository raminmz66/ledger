# دفتر حساب سیمرغ (ledger)

Persian RTL mobile-first PWA ledger: people, money paid/received, Jalali dates. Cloudflare Worker + D1, React + Vite.

## Start of every session

1. Read `docs/STATUS.md`: where we are and the exact next step.
2. Spec: `docs/superpowers/specs/2026-10-06-simorgh-ledger-design.md`. Roadmap: `docs/ROADMAP.md`. Mockups: `docs/mockups/`.

## Rules

- All Persian text (UI, emails, user docs) follows the `persian-writing` skill in `.claude/skills/persian-writing`. Run its `scripts/fa_lint.py --check` on `src/client/copy.ts` before closing a milestone.
- Reuse components from https://github.com/raminmz66/personal-asset-tracker before writing new ones (list in spec §2).
- At the end of every task: update `docs/STATUS.md` (last done, next step, log line) and tick `docs/ROADMAP.md`, in the same commit.
