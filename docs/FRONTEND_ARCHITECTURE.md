# Frontend Architecture

## Table of Contents

- [1. Frontend Goals](#1-frontend-goals)
- [2. Technology Stack](#2-technology-stack)
- [3. Project Structure](#3-project-structure)
- [4. Routing Architecture](#4-routing-architecture)
- [5. Layout System](#5-layout-system)
- [6. Feature Module Architecture](#6-feature-module-architecture)
- [7. API Architecture](#7-api-architecture)
- [8. State Management](#8-state-management)
- [9. Data Fetching Strategy](#9-data-fetching-strategy)
- [10. Form Architecture](#10-form-architecture)
- [11. Table Architecture](#11-table-architecture)
- [12. File Upload Architecture](#12-file-upload-architecture)
- [13. Authentication](#13-authentication)
- [14. Permission System](#14-permission-system)
- [15. Error Handling](#15-error-handling)
- [16. Notification System](#16-notification-system)
- [17. Loading Experience](#17-loading-experience)
- [18. Design System Architecture](#18-design-system-architecture)
- [19. Performance Strategy](#19-performance-strategy)
- [20. Testing Strategy](#20-testing-strategy)
- [21. Development Standards](#21-development-standards)
- [22. Implementation Roadmap](#22-implementation-roadmap)
- [23. Final Review](#23-final-review)

---

## 1. Frontend Goals

### Design philosophy
- API-first, contract-driven UI implementation.
- Feature-module architecture over page-centric sprawl.
- Predictable state boundaries and explicit permissions.
- Reusable primitives (forms, tables, filters, dialogs) before bespoke components.

### Performance goals
- First authenticated route interactive within ~2.5s on typical broadband.
- Route transition perceived latency under 250ms for cached data.
- Avoid waterfall requests on dashboard and details pages.

### Scalability goals
- Support new modules by adding new feature folders, not cross-cutting rewrites.
- Keep query keys and API service boundaries stable for multi-team development.
- Keep role gating centralized so policy changes are low-cost.

### Maintainability goals
- Single API client, shared error mapper, shared DTO schema mapping.
- Strict TypeScript + Zod parsing at module boundaries.
- Consistent naming and folder conventions across all features.

### Accessibility goals
- Keyboard-operable forms/tables/dialogs.
- Semantic controls and focus management.
- Screen-reader labels for icon-only actions.

### Responsive design goals
- Desktop-first operational UI.
- Tablet-compatible split/stacked layouts.
- Mobile-safe fallback for key workflows (view, approvals, retries, monitoring).

---

## 2. Technology Stack

## Core
- **Framework:** Next.js (App Router)
  - Layout composition, route groups, nested sections, server/client boundary control.
- **Language:** TypeScript
  - Shared static contracts, safer refactors, strict DTO alignment.

## UI and Styling
- **Styling:** Tailwind CSS
  - Utility-first speed + design token consistency.
- **UI Library:** shadcn/ui
  - Accessible base primitives and strong composability.
- **Icons:** Lucide
  - Lightweight, consistent iconography.

## Data and Forms
- **Data Fetching:** TanStack Query
  - Caching, invalidation, polling, request dedupe, background refresh.
- **Forms:** React Hook Form
  - High-performance controlled/uncontrolled hybrid forms.
- **Validation:** Zod
  - Runtime-safe schemas and typed form + API payload parsing.
- **Tables:** TanStack Table
  - Extensible table state model for pagination/filter/sort/visibility.
- **Charts:** Recharts
  - Fast implementation for dashboard and analytics metrics.
- **Date library:** date-fns
  - Tree-shakeable, ergonomic date operations.
- **Notifications:** Sonner
  - Non-intrusive toasts for async operations.

## HTTP
- **Recommendation:** Axios wrapper (not raw fetch)
  - Interceptors for auth refresh flow.
  - Request cancellation support.
  - Consistent timeout and normalized error mapping.

## State management
- **Zustand decision:** **Not required initially**
  - TanStack Query + URL state + local component state cover current needs.
  - Global store is only justified for cross-route UI shell preferences (sidebar/theme draft filters). Use lightweight context first.
  - Reassess Zustand only if cross-feature mutable client state becomes complex.

---

## 3. Project Structure

```text
apps/web/
  src/
    app/
      (public)/
      (auth)/
      (app)/
      api/                  # only frontend-specific route handlers if needed
      globals.css
      layout.tsx
    components/
      ui/                   # shadcn-wrapped shared primitives
      shared/               # generic app components (table shell, dialogs)
    features/
      auth/
      dashboard/
      campaigns/
      ad-sets/
      ads/
      creatives/
      creative-assets/
      storage/
      campaign-generator/
      ai-copy/
      publisher/
      synchronization/
      automation/
      analytics/
      reporting/
      shopify/
      platform-connections/
      platform-credentials/
      ad-accounts/
      organizations/
      memberships/
      invitations/
      users/
      settings/
    lib/
      api/                  # axios client + interceptors + normalizers
      auth/                 # token/session helpers
      permissions/          # role/action guards
      query/                # query client setup and key factories
      zod/                  # shared schemas and adapters
    hooks/
      use-debounced-value.ts
      use-permission.ts
      use-pagination-state.ts
      use-polling.ts
    providers/
      app-providers.tsx
      query-provider.tsx
      session-provider.tsx
      theme-provider.tsx
    layouts/
      app-shell/
      breadcrumbs/
      sidebar/
      topbar/
    constants/
      routes.ts
      enums.ts
      ui.ts
      query-keys.ts
    types/
      api.ts
      dto.ts
      domain.ts
      ui.ts
    utils/
      formatters.ts
      guards.ts
      download.ts
      errors.ts
    styles/
      tokens.css
    assets/
      icons/
      illustrations/
```

### Directory responsibility
- `app/`: route definitions and layout composition only.
- `features/`: per-domain module implementation (components/hooks/service/schema).
- `lib/api`: single HTTP contract boundary.
- `providers`: runtime wrappers (query, auth session, theme).
- `types`: generated/manual shared frontend types aligned to backend DTOs.

---

## 4. Routing Architecture

### Public routes
- `/login`
- `/register`

### Authenticated routes (protected)
- `/dashboard`
- `/campaigns`
- `/campaigns/[id]`
- `/ad-sets`
- `/ads`
- `/creatives`
- `/creative-assets`
- `/storage`
- `/campaign-generator`
- `/ai-copy`
- `/publisher`
- `/synchronization`
- `/automation/pipelines`
- `/automation/pipelines/[id]`
- `/automation/runs`
- `/automation/runs/[id]`
- `/automation/workflows`
- `/analytics`
- `/analytics/[id]`
- `/reports`
- `/shopify`
- `/platform-connections`
- `/platform-credentials`
- `/ad-accounts`
- `/organization`
- `/members`
- `/invitations`
- `/memberships`
- `/profile`
- `/settings`

### Dynamic routes
- `/campaigns/[id]`
- `/analytics/[id]`
- `/automation/pipelines/[id]`
- `/automation/runs/[id]`

### Route groups and nested layouts
- `(public)`: unauthenticated layout.
- `(app)`: authenticated shell layout.
- Nested module sections under `(app)` with breadcrumb + local header slots.

### Route protection model
- Middleware-level auth check for protected trees.
- In-route role and action guard hooks for fine-grained controls.

---

## 5. Layout System

### Public Layout
- Minimal header, centered form container, auth-focused.

### Authenticated Layout (App Shell)
- Left sidebar + top header + breadcrumb row + content container.
- Contains organization switcher, user menu, notifications anchor.

### Organization Layout
- Secondary tab navigation for `organization`, `members`, `invitations`, `memberships`.

### Module Layout
- Module title, actions area, filters toolbar, content region.

### Page Layout
- Standardized page sections:
  1. Header (title/actions)
  2. Filter/search row
  3. Content card/table/chart
  4. Empty/error panel fallback

### Shared shell components
- `SidebarNav`, `TopBar`, `BreadcrumbTrail`, `ContentContainer`.

---

## 6. Feature Module Architecture

Each feature module uses:
- `components/`
- `hooks/`
- `api/`
- `schemas/`
- `types/`
- `pages/` (route-bound composition only)
- `utils/`

### Feature list (22 modules)
1. Auth  
2. Dashboard  
3. Campaigns  
4. Ad Sets  
5. Ads  
6. Creatives  
7. Creative Assets  
8. Storage  
9. Campaign Generator  
10. AI Copy  
11. Publisher  
12. Synchronization  
13. Automation  
14. Analytics  
15. Reporting  
16. Shopify  
17. Platform Connections  
18. Platform Credentials  
19. Ad Accounts  
20. Organizations  
21. Memberships + Invitations  
22. Users + Settings

### Module contract rules
- API functions only inside `features/*/api`.
- React Query hooks only inside `features/*/hooks`.
- Zod request/response adapters inside `features/*/schemas`.
- No cross-feature imports of component internals; expose feature public APIs via index files.

---

## 7. API Architecture

### API client
- `lib/api/client.ts`: axios instance with:
  - `baseURL` from env
  - default timeout (15s normal; override for uploads/exports)
  - JSON headers by default

### Request interceptor
- Attach bearer token from session store/cookie.

### Response interceptor
- Normalize backend envelope:
  - success path returns `data`
  - failure maps `{ statusCode, message, correlationId }` into typed `AppError`

### Refresh token flow
- On `401` (except login/register/refresh routes):
  1. single-flight refresh call (`POST /api/auth/refresh`)
  2. update token storage
  3. replay failed request once
  4. if refresh fails, clear session and redirect `/login`

### Retry policy
- GET requests: retry max 2 for transient network/5xx.
- Mutations: no automatic retry except explicitly idempotent sync/status fetches.

### Timeouts
- Standard: 15s
- Upload: 60s
- Export download: 60s+

### Request cancellation
- Use `AbortController`/axios cancellation tokens in list/search pages.

### File uploads
- `multipart/form-data` with progress callbacks.

### Response normalization
- Adapter function unwraps nested success envelopes safely and preserves raw metadata for debugging.

---

## 8. State Management

### React local state
- Modal open state
- Table column visibility
- Local unsaved form UI state

### TanStack Query
- Server state (entities, lists, dashboards, runs, statuses)
- Polling and background refresh

### Context
- Session context (tokens/user/org summary)
- App shell preferences (sidebar collapsed, theme)

### URL state
- Pagination page/limit
- Filters/search/sort
- Date range and analytics dimensions

### Global store
- No Zustand initially.
- If needed later: only for shell-level UI preferences, not server domain entities.

---

## 9. Data Fetching Strategy

### Caching
- Key-based cache per feature and parameter set.
- Default stale times:
  - lists: 30s
  - dashboard: 15s
  - analytics summary: 30s
  - details: 60s

### Invalidation
- Invalidate feature list keys after create/update/delete.
- Invalidate related downstream surfaces (example: publish invalidates sync/dashboard recent).

### Prefetching
- Prefetch detail on row hover/focus (campaigns, automation runs).
- Prefetch dashboard granular endpoints after shell load.

### Polling
- Automation run detail: poll every 5s until terminal.
- Sync status page: poll every 10s while operation active.
- Publisher post-submit monitor: poll relevant sync/run views.

### Optimistic updates
- Use sparingly for low-risk metadata edits.
- Avoid optimistic updates for publish/sync/automation terminal status.

### Background refresh
- Enable window-focus refetch for dashboard and lists.

### Pagination strategy
- Server-side pagination with query params mirroring backend DTOs.

---

## 10. Form Architecture

### Standard stack
- RHF + Zod resolver.
- Typed schema per feature request DTO.

### Submission flow
1. Validate client-side with Zod.
2. Submit mutation.
3. Show inline field/server error mapping.
4. On success: toast + invalidate + route/close modal.

### Reusable form components
- `FormFieldText`, `FormFieldSelect`, `FormFieldNumber`, `FormFieldDate`, `FormFieldJson`, `FormActions`.

### Error handling
- Field errors mapped from Zod and backend validation messages.
- Non-field errors shown in form alert region.

---

## 11. Table Architecture

### Reusable DataTable system
- Base component built on TanStack Table.
- Plug-in toolbar for filters/search/actions.

### Supported capabilities
- Server pagination
- Server sort
- Filter controls
- Column visibility/pinning (client-side preference)
- Row selection
- Bulk selection UI
- Bulk actions UI (disabled where backend lacks bulk endpoints)
- Loading skeleton
- Empty state
- Error state with retry

### Components
- `DataTable`
- `DataTableToolbar`
- `DataTablePagination`
- `DataTableEmptyState`
- `DataTableErrorState`

---

## 12. File Upload Architecture

### Upload component model
- `UploadDropzone` + `UploadQueue` + `UploadProgressRow`.

### Workflow
1. Pre-validate file count/size/type (frontend mirror of backend expectations).
2. Start upload with progress callback.
3. Handle success per-file with persisted metadata.
4. Allow cancel while request in-flight.
5. Allow retry for failed files.

### Validation
- Enforce known accepted extensions/MIME hints in UI.
- Still trust backend as final validator.

---

## 13. Authentication

### JWT storage strategy
- Access token in memory + secure persistence strategy (httpOnly cookie preferred if backend supports; otherwise controlled local storage fallback with strict guard).
- Refresh handled via backend endpoint; never exposed in UI state beyond secure transport boundaries.

### Session restoration
- On app boot:
  1. load persisted session token (if present)
  2. call `/api/auth/me`
  3. if 401, try refresh once
  4. route to login if unresolved

### Route protection
- Middleware for protected route groups.
- Client-side guard fallback for hydration race conditions.

### Organization switching
- Use `/api/auth/switch-organization`, then reset query caches and reroute to dashboard.

### Logout
- Call `/api/auth/logout`, clear token/session state, clear cache, redirect to `/login`.

---

## 14. Permission System

### Page protection
- Route-level guard by role (from session payload + backend-driven checks).

### Component protection
- `Can` component and `usePermission` hook:
  - `canView`, `canCreate`, `canEdit`, `canDelete`, `canRun`, `canPublish`, `canSync`, `canManage`.

### Button visibility and action guards
- Hide unavailable actions by role.
- Also hard-block via disabled + tooltip if conditionally unavailable due to entity state.

### Enforcement principle
- Frontend permissions for UX only.
- Backend remains ultimate authority; gracefully handle 403 responses.

---

## 15. Error Handling

### HTTP handling map
- `401`: attempt refresh; fallback logout.
- `403`: show permission warning panel.
- `404`: resource-not-found view with safe back navigation.
- `409`: optimistic lock/conflict dialog with reload option.
- `422`/`400`: field or business validation display.
- `500`: generic error state + correlation ID display.

### Network failures
- Show retry banner and preserve local edits.
- Detect offline and suspend polling.

### Expired sessions
- Global session-expired modal + redirect to login.

---

## 16. Notification System

### Toast classes
- Success, Error, Warning, Info.

### Usage patterns
- Mutations: success/failure toast.
- Long-running operations: start/pending/complete toasts with action links.
- Confirmations: destructive actions via modal dialog, not toast.

### Long-running operations
- Publisher, sync, automation run launch should emit persistent pending notification with deep-link to status page.

---

## 17. Loading Experience

### Standards
- Skeletons for dashboard/cards/tables.
- Inline spinners for buttons.
- Suspense boundaries around route segments with graceful fallback.
- Progress indicators for uploads and exports.
- Empty states with clear CTA.

---

## 18. Design System Architecture

### Tokens
- Typography: semantic scale (`text-xs`..`text-3xl`) mapped to heading/body roles.
- Spacing: 4px grid increments.
- Radius: small/medium/large consistent across cards/inputs/dialogs.
- Elevation: subtle card shadows + stronger modal elevation.

### Color
- Semantic palette: primary/success/warning/error/info.
- Neutral scales for text/surfaces/borders.
- Ensure AA contrast.

### Dark mode readiness
- Token-based theming, avoid hard-coded colors.

### Responsive breakpoints
- `sm`, `md`, `lg`, `xl`, `2xl` Tailwind defaults.

### Reusable component standards
- All shared components accept loading/error/empty states where applicable.
- Prefer composition over prop explosion.

---

## 19. Performance Strategy

### Lazy loading and code splitting
- Route-level code splitting by App Router default.
- Lazy-load heavy chart/table modules.

### Image optimization
- Next image optimization for static/media previews where possible.

### Memoization
- Memoize expensive table column definitions and chart transforms.

### Virtualization
- Enable table row virtualization for large list surfaces (analytics tables, assets).

### Bundle optimization
- Import date-fns functions per-module.
- Avoid large icon package imports (Lucide direct component imports only).

---

## 20. Testing Strategy

### Unit tests
- Utility functions, schema adapters, permission helpers.

### Component tests
- Forms, table wrappers, route guards, status widgets.

### Integration tests
- Feature hooks + API mock behavior (query invalidation, refresh retry flow).

### E2E tests
- Critical flows: login -> generator -> AI copy -> publish -> sync -> analytics.

### Mock API strategy
- Use MSW for local/integration tests with contract-like fixtures based on integration guide payloads.

---

## 21. Development Standards

### Naming
- Files: kebab-case.
- Components: PascalCase.
- Hooks: `useXxx`.
- Types/interfaces: PascalCase.
- Constants: `UPPER_SNAKE_CASE`.

### Imports
- Feature-local relative imports within module.
- Alias imports for cross-cutting libs (`@/lib`, `@/components`, `@/features`).

### Barrel exports
- Allowed at feature root only; avoid deep barrel chains.

### Code organization
- Keep pages thin (composition only).
- Keep business logic in hooks/services/adapters.

---

## 22. Implementation Roadmap

### Phase 1: Foundation
- Scope: auth, app shell, routing, providers, layouts, theme.
- Complexity: Medium
- Dependencies: backend auth endpoints and integration guide contracts.
- Order:
  1. app shell + route groups
  2. auth/session client and guards
  3. shared API client and error mapper
  4. navigation and breadcrumbs

### Phase 2: Core operations
- Scope: dashboard, campaigns, campaign generator, AI copy.
- Complexity: High
- Dependencies: table/form architecture and shared primitives.
- Order:
  1. reusable DataTable + filter framework
  2. campaigns/ad-sets/ads pages
  3. generator wizard
  4. AI copy run/review surface

### Phase 3: Execution modules
- Scope: publisher, synchronization, automation.
- Complexity: High
- Dependencies: long-running operation UX and polling framework.
- Order:
  1. publisher validate/publish
  2. synchronization actions and status
  3. automation pipelines and runs

### Phase 4: Insights and administration
- Scope: analytics, storage, shopify, organization, settings, reporting polish.
- Complexity: Medium-High
- Dependencies: charts and upload system finalization.
- Order:
  1. analytics + export UX
  2. storage/creative-assets tooling
  3. integrations admin pages
  4. org/settings/reporting surfaces

---

## 23. Final Review

Cross-check target:
- `docs/PROJECT_CONTEXT.md`
- `docs/FRONTEND_INTEGRATION_GUIDE.md`
- `docs/FRONTEND_PRODUCT_SPECIFICATION.md`

Verification result:
- No implemented backend API from integration guide is omitted from architecture.
- No non-existent API is required by this architecture.
- Every backend module in integration guide has a mapped frontend feature module.
- Route hierarchy supports all documented workflows.
- State ownership is consistent (server state in Query, UI state local/context).
- Auth refresh/session model is aligned with backend behavior.
- Permission model mirrors backend roles and endpoint restrictions.

Known boundaries (intentional):
- Forgot/reset password flows remain absent (backend not implemented).
- Organization collection create/list/delete pages are not architected as active routes (backend not implemented).

