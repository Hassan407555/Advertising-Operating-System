# AI Meta Ads Studio — API

NestJS backend for **AI Meta Ads Studio**.

## Setup

```bash
cp .env.example .env
# From repo root (recommended):
docker compose -f docker-compose.dev.yml up -d
npx prisma migrate deploy
pnpm start:dev
```

- Health: `GET http://localhost:3001/api/health`
- Swagger (non-production): `http://localhost:3001/api/docs`

## Environment

See `.env.example`. Critical variables:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | PostgreSQL |
| `JWT_SECRET` / `REFRESH_TOKEN_SECRET` | Min **32** characters each |
| `ENCRYPTION_KEY` | Min 32 characters |
| `SHOPIFY_*` | Required at startup |
| `GEMINI_API_KEY` | Required when `AI_PROVIDER=GEMINI` |
| `CORS_ORIGIN` | Required in production; cannot be `*` |

## Active modules

Auth, organizations, Shopify, stores, AI sessions, campaigns, analytics, dashboard, storage, ad accounts, platform connections/credentials.

## Deprecated modules (on disk, not registered)

See `src/modules/LEGACY_MODULES.md`. Do not re-enable without an explicit Phase 10 decision.
