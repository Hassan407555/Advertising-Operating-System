# AI Meta Ads Studio

Portfolio SaaS that generates high-quality **Meta Ads** campaign drafts for **Shopify** products using **Gemini**.

> Constitution: [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) — do not redesign the product without explicit approval.

## Monorepo

| App | Path | Default URL |
|-----|------|-------------|
| API (NestJS) | `apps/api` | http://localhost:3001/api |
| Web (Next.js) | `apps/web` | http://localhost:3000 |

## Quick start

```bash
# Postgres
docker compose -f docker-compose.dev.yml up -d

# API
cp apps/api/.env.example apps/api/.env
cd apps/api && npx prisma migrate deploy && pnpm start:dev

# Web (separate terminal)
cp apps/web/.env.example apps/web/.env.local
cd apps/web && pnpm dev
```

Full environment notes: [`docs/BACKEND_ENVIRONMENT_SETUP.md`](docs/BACKEND_ENVIRONMENT_SETUP.md).

## Core workflow

Login → Organization → Connect Shopify → Sync products → Advertising configuration → Advertise product → AI interview → Gemini generation → Review → Save draft → Campaign history

## Phase status

Feature-complete through Phase 9 (dashboard polish). Phase 9.5 is production readiness. **Phase 10** (optional) is Meta Marketing API publish — not started.

## Documentation

| Doc | Purpose |
|-----|---------|
| `docs/PROJECT_CONTEXT.md` | Product constitution (locked) |
| `docs/BACKEND_ENVIRONMENT_SETUP.md` | Env + local smoke checks |
| `apps/api/README.md` | API setup |
| `apps/web/README.md` | Web setup |
| `apps/api/src/modules/LEGACY_MODULES.md` | Unwired Advertising OS modules |
