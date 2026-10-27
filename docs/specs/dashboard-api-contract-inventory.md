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
| `api/config.js` | GET loads mirrored config and may fetch bot config; POST merges config and pushes to Railway | `guildId`, existing `lib/guildConfig.js` semantics, `DASHBOARD_API_SECRET`. GET has possible write side effects when recovering from missing mirrored config. |
| `lib/accounts.js` | Account CRUD and Discord identity linking against existing `accounts` table; password hashing uses bcrypt | Preserve current column names and account records. |
| `lib/guildConfig.js` | Guild config key convention is `guild_config:<guildId>`; merge/normalization supports nested feature objects and self-role structures | Do not alter schema or normalize/rewrite records on read. Partial writes must preserve unknown and unrelated keys. |

## Verified feature families in current UI

The legacy root page's initial navigation includes Overview, Moderation, Invites, Leveling, Currency, Shop, Logs, Settings, and Server View. The dynamically injected feature UI also contains Bump, Verification, Suggestions, Tickets, QOTD, and Self Roles. The backend config handler references additional config families including analytics, AI, automod, applications, LOA, activity checks, systems, audit logging, and logging.

This is a starting list, not a complete feature sign-off. Before the new shell replaces the legacy page, inspect every `api/*.js` handler and every frontend script loaded by the full legacy HTML, then map every setting/control to an existing route or mark the blocker explicitly.

## First isolated shell deliverable

- Added `dashboard-v2.html`, `dashboard-v2.css`, and `dashboard-v2.js` on `rebuild/dashboard-v1`.
- The shell calls the existing read-oriented `/api/guilds` and `/api/bot-status` endpoints with same-origin credentials.
- It does not call `/api/config` or save settings during initial load.
- Feature pages are intentionally marked as not connected until the exact legacy configuration contracts are mapped. This prevents placeholder controls from accidentally writing empty data.
- The production entry point has not been changed.
