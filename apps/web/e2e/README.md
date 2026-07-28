# E2E tests (temporarily disabled)

Playwright config collects **zero** tests (`testMatch: /(?!)/`) so CI/scripts do not fail on stale Advertising OS journeys.

Restore by:

1. Rewriting `auth-journey.spec.ts` / `rc1-journey.spec.ts` for AI Meta Ads Studio nav and copy
2. Restoring a normal `testMatch` in `playwright.config.ts`
