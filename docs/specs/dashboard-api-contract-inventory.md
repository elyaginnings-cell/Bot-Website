# Dashboard API and feature compatibility inventory

Status: initial inventory for the isolated `rebuild/dashboard-v1` branch. This document records only contracts verified from source inspected so far; it is not a claim that every feature has been fully traced.

## Guardrails

- Existing PostgreSQL schema and data are not to be altered by this rebuild.
- Keep the existing `app_session`, `discord_session`, and `oauth_state` cookie names and current session encryption contract.
- Preserve staff authorization via `requireAnySession` on dashboard routes.
- Keep Vercel API aliases and Railway bot paths compatible until each caller is migrated and tested.
- Avoid configuration reads that have hidden write side effects. In particular, the current `GET /api/config?guildId=...` may mirror bot configuration into Postgres when no website record exists. Treat this route as potentially mutating until its behavior is refactored and tested.
- Never save empty/default configuration merely because a fetch failed or the UI first rendered.

## Verified route aliases

Source: `vercel.json`.

| Public path | Internal handler | Notes |
|---|---|---|
| `/api/signup` | `/api/auth-login?action=signup` | Existing password signup flow; staff email allowlist applies |
| `/api/login` | `/api/auth-login?action=login` | GET starts Discord OAuth; POST handles password login |
| `/api/logout` | `/api/auth-login?action=logout` | Preserve current cookie-clearing behavior |
| `/api/roles` | `/api/channels?resource=roles` | Authenticated role retrieval |
| `/api/presence` | `/api/bot-status?resource=presence` | Authenticated GET/POST presence integration |
| `/api/guild-meta` | `/api/guilds?resource=meta` | Guild metadata helper |
| `/api/role-manage` | `/api/channel-manage?resource=roles` | Role management compatibility route |
| `/api/invite-bot` | `/api/guilds?resource=invite` | Bot invite flow |

## Verified handlers and contracts

| Handler/module | Verified behavior | Dependencies / caution |
|---|---|---|
| `api/auth-login.js` | Password login validates credentials, checks staff allowlist/identity, then issues existing session cookies; GET login can initiate Discord OAuth | `SESSION_SECRET`, staff configuration, account helpers. Do not change cookie/session formats as part of UI work. |
| `lib/session.js` | Cookie names are `app_session`, `discord_session`, `oauth_state`; app session is AES-256-GCM `v2` format | Requires `SESSION_SECRET`. Existing sessions are sensitive to encryption format and secret changes. |
| `lib/requireAuth.js` | `requireAnySession` rejects unauthenticated sessions and sessions without `staff: true` | Must remain enforced on dashboard API routes. |
| `api/guilds.js` | Authenticates request, calls Railway `/api/guilds`, returns `{ guilds }`; separate metadata and invite branches exist | `BOT_API_URL`, `DASHBOARD_API_SECRET`, Discord bot token for relevant branches. |
| `api/channels.js` | Authenticates request and calls Railway `/api/guild/:guildId/channels` or `/roles` | `guildId`, `DASHBOARD_API_SECRET`; keep guild-scoped requests isolated. |
| `api/bot-status.js` | Authenticates request; checks website DB health and Railway status; presence GET/POST is handled on same route | `BOT_API_URL`, `DASHBOARD_API_SECRET`, database URL. |
| `api/config.js` | Legacy GET may fetch bot config and write a missing mirror; POST merges and pushes config | `guildId`, existing `lib/guildConfig.js` semantics, `DASHBOARD_API_SECRET`. Avoid using this GET in the new UI because it can write during a read. |
| `api/config.js?mode=readonly` and `api/config.js?mode=compat` (new modes in existing function) | GET reads an existing `bot_state` row using a no-DDL query; POST merges an explicit patch into an existing row and attempts a Railway sync | Uses `queryExistingSchema`; does not create tables, migrate schema, create missing config rows, or save on GET. POST refuses when no existing config row exists. Both modes verify the selected guild against the bot API before touching storage. Implemented inside the existing function to respect the Vercel Hobby serverless-function limit. |
| `lib/dashboardConfigMerge.js` (new) | Pure partial merge and allowlisted bot payload helper | Preserves unknown keys and unrelated nested settings; arrays change only when explicitly included in the patch. |
| `lib/db.js` | Existing `query()` still uses the legacy schema-initialization path; new `queryExistingSchema()` runs a query against the already-provisioned schema only | New dashboard config route uses the no-DDL helper. Existing login code remains unchanged. |
| `lib/accounts.js` | Account CRUD and Discord identity linking against existing `accounts` table; password hashing uses bcrypt | Preserve current column names and account records. |
| `lib/guildConfig.js` | Guild config key convention is `guild_config:<guildId>`; merge/normalization supports nested feature objects and self-role structures | Do not alter schema or normalize/rewrite records on read. Partial writes must preserve unknown and unrelated keys. |

## Verified feature families in current UI

The legacy root page's initial navigation includes Overview, Moderation, Invites, Leveling, Currency, Shop, Logs, Settings, and Server View. The dynamically injected feature UI also contains Bump, Verification, Suggestions, Tickets, QOTD, and Self Roles. The backend config handler references additional config families including analytics, AI, automod, applications, LOA, activity checks, systems, audit logging, and logging.

This is a starting list, not a complete feature sign-off. Before the new shell replaces the legacy page, inspect every `api/*.js` handler and every frontend script loaded by the full legacy HTML, then map every setting/control to an existing route or mark the blocker explicitly.

## First isolated shell deliverable

- Added `dashboard-v2.html`, `dashboard-v2.css`, and `dashboard-v2.js` on `rebuild/dashboard-v1`.
- The shell calls the existing `/api/guilds` endpoint with same-origin credentials. It intentionally does not call `/api/bot-status`, whose DB health probe uses the legacy query helper that can initialize schema.
- It does not call the legacy `/api/config` route. The new `/api/dashboard-config` GET is read-only and uses no-DDL database access. Nothing is saved during initial load.
- Feature pages are intentionally marked as not connected until the exact legacy configuration contracts are mapped. This prevents placeholder controls from accidentally writing empty data.
- The production entry point has not been changed.

## Initial editable settings and known limitations

The new shell currently has editable controls for existing mapped fields: automod enabled, warning/log channel IDs, leveling enabled and channels, currency/shop enabled, saved community feature enable flags, staff applications/LOA/activity-check flags, and logging/audit-log flags. Self-role data is shown as read-only counts until a dedicated editor can preserve every nested ID and message/channel reference. This is intentionally safer than shipping a partial self-role editor that might erase saved role menus.

A save merges only the changed fields into the existing JSON object, writes the existing `bot_state` row using a parameterized UPDATE, then attempts to sync the allowlisted config fields to the existing Railway API. If no row exists, the endpoint refuses to create one from defaults. If bot sync fails after the database update, the UI reports the warning rather than pretending both systems were updated.

Automated tests were added for route aliases, auth/session invariants, no-DDL route design, navigation registry coverage, and partial merge preservation. A GitHub Actions workflow runs these with Node's built-in test runner. The tests still need a completed CI run before claiming they pass.
