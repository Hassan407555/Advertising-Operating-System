# AI Meta Ads Studio — Web

Next.js frontend for **AI Meta Ads Studio**: generate Meta Ads campaign drafts for Shopify products using AI.

## Setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

App: [http://localhost:3000](http://localhost:3000)

API must be running on port **3001** (see `apps/api`).

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes (production) | API base including `/api`, e.g. `http://localhost:3001/api` |

See `.env.example`.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build |
| `pnpm lint` / `pnpm typecheck` | Quality checks |
| `pnpm test:e2e` | Playwright (disabled until specs are restored) |

## Product navigation

Dashboard · Products · Campaign History · AI Sessions · Analytics · Advertising · Shopify · Organization · Settings

Legacy Advertising OS routes (`/publisher`, `/campaign-generator`, etc.) return **404** and are marked deprecated under `src/features/LEGACY_FEATURES.md`.

## Auth note

Access and refresh tokens are stored in `localStorage` and mirrored to a non-HttpOnly cookie for edge gating (`src/proxy.ts`). Treat XSS hardening as a production concern; the API remains Bearer-token based.
