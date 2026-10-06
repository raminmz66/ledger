# دفتر حساب سیمرغ

A small Persian (RTL) PWA for tracking money you pay to and receive from people. Sign in with email and a one-time code, record transactions with Jalali dates, see each person's balance.

Status: M1 skeleton deployed (https://simorgh-ledger.bartaran.workers.dev). See [docs/STATUS.md](docs/STATUS.md) and [docs/ROADMAP.md](docs/ROADMAP.md).

Stack: Cloudflare Workers + D1, Hono, React + Vite, Vazirmatn.

## Development

    npm install
    cp .dev.vars.example .dev.vars
    npx wrangler d1 migrations apply simorgh-db --local
    npm run dev        # Vite + Worker on one port
    npm test

## Deploy (Cloudflare)

    npx wrangler d1 migrations apply simorgh-db --remote
    npm run deploy

Secrets (once): `SESSION_SECRET`, `RESEND_API_KEY` via `npx wrangler secret put <NAME>`.
