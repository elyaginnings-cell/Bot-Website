# Dashboard rebuild progress ledger

Plan: `docs/plans/2026-10-27-discord-dashboard-rebuild.md`

## Task 1: Compatibility inventory and regression baseline
- Initial verified inventory documented in `docs/specs/dashboard-api-contract-inventory.md`.
- Contract tests added for Vercel aliases, session cookies, staff authorization, storage key convention, and new dashboard safety invariants.
- Node built-in test workflow added; the CI run has not yet been independently confirmed.

## Task 2: Responsive frontend shell
- Added `dashboard-v2.html`, `dashboard-v2.css`, and `dashboard-v2.js` on the isolated branch `rebuild/dashboard-v1`.
- Added one grouped responsive navigation system, mobile drawer, selected-server picker, overview cards, and accessible setting controls.
- Added mapped controls for moderation, AI assistant, detailed leveling and currency settings, shop toggle, community features, staff features, and logging. Mirrored legacy top-level flags are saved alongside nested feature flags.
- Self-role data is intentionally read-only until a complete editor can preserve nested IDs and references.
- The new shell has not replaced the existing root/login page.

## Task 3: Compatibility-safe config boundary
- Added `queryExistingSchema` to `lib/db.js`; it executes queries without running the legacy schema-initialization routine.
- Added `lib/dashboardConfigMerge.js` to preserve unrelated and unknown config keys during explicit partial updates.
- Added `mode=readonly` and `mode=compat` to the existing `api/config.js` function. This avoids exceeding the Vercel Hobby plan's serverless-function limit.
- Safe GET does not write or create a missing config row. Safe POST updates only an existing row and refuses to synthesize defaults.
- Both safe modes verify that the requested guild exists in the bot API's guild list before reading or writing. These modes live in the existing `api/config.js` function to stay under the Vercel Hobby limit.
- Manually exercised the safe GET and partial-merge POST branches with mocked database and bot clients; verified read-only GET uses SELECT only, guild access rejects an unknown guild, and unrelated/self-role fields survive a partial update. This is not an end-to-end production test.

## Task 4: Feature pages
- The first pass of mapped settings controls is connected to the safe compatibility modes.
- Not yet complete: full inventory of every legacy control, shop item editor, complete self-role editor, live logs/server view, full feature parity, and end-to-end tests.

## Task 5: Release readiness
- Not started. Production entry point remains untouched, and no production deployment or merge has been performed.
