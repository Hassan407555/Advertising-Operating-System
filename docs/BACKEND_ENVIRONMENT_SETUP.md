# Backend environment setup

## Prerequisites

1. PostgreSQL 16+ (local service or Docker)
2. Node.js matching the repo toolchain
3. Copied environment files (see below)

## Quick start (Docker Postgres)

From the repository root:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Copy environment templates:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Apply migrations and start the API:

```bash
cd apps/api
npx prisma migrate deploy
pnpm start:dev
```

Start the web app:

```bash
cd apps/web
pnpm dev
```

Verify:

- Health: `GET http://localhost:3001/api/health` → service name **AI Meta Ads Studio API**
- Swagger (non-production): `http://localhost:3001/api/docs`
- Web: `http://localhost:3000`

## Required environment variables

See `apps/api/.env.example` and `apps/web/.env.example`.

Critical (API):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Access token signing (**secret min 32 chars**) |
| `REFRESH_TOKEN_SECRET` / `REFRESH_TOKEN_EXPIRES_IN` | Refresh token signing (**secret min 32 chars**) |
| `ENCRYPTION_KEY` | Platform credential encryption (min 32 chars) |
| `SHOPIFY_*` | Required by startup validation |
| `GEMINI_API_KEY` | Required when `AI_PROVIDER=GEMINI` |
| `GEMINI_MODEL` | Optional; default `gemini-2.0-flash` |
| `AI_MAX_OUTPUT_TOKENS` | Optional default; campaign generation overrides to 4096 per call |
| `PORT` | Defaults to **3001** (avoids conflict with Next.js on 3000) |
| `CORS_ORIGIN` | Required in production; must be explicit origin(s), not `*` |

Critical (Web):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | API base including `/api` (e.g. `http://localhost:3001/api`) |

## Auth model notes

- Access/refresh tokens are returned in JSON bodies (Bearer auth). The API does **not** set HttpOnly session cookies.
- Refresh tokens are stored hashed on the user record and rotated on each refresh.
- Inactive users cannot login, refresh, or access JWT-protected routes.
- `JwtAuthGuard` is a global `APP_GUARD`. Public routes use `@Public()` (auth register/login/refresh, health, Shopify OAuth callback).

## Cookie note (frontend)

The web app mirrors the access token into a non-HttpOnly cookie for Next.js edge gating via `apps/web/src/proxy.ts`. That is a frontend concern; the backend remains Bearer-token based.

## Smoke validation checklist

With API on `:3001` and web on `:3000`:

1. `GET /api/health` → `status=ok`, `database=up`, service = AI Meta Ads Studio API
2. `GET /api/docs` → Swagger UI loads (when enabled)
3. Register → Login → `/auth/me` → `/users/me` → `/dashboard`
4. `POST /auth/switch-organization` with organization CUID succeeds
5. Store list via `GET /api/stores` (multi-store)
6. Browser Origin `http://localhost:3000` receives `Access-Control-Allow-Origin`
7. Legacy routes `/api/publisher`, `/api/campaign-generator`, etc. are **not** registered
