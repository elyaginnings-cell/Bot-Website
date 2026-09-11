# THE COFFEE SHOP — Feature Roadmap

See the canonical copy in the Discord-Bot repo: https://github.com/elyaginnings-cell/Discord-Bot/blob/main/ROADMAP.md

This repo (Bot-Website) owns the website side of every system. Bot owns commands, events, and the dashboard API.

**Rule:** finish one system in both places, then move on.

## Phase 0 — COMPLETE

Server view Discord fidelity shipped:
- Replies, reactions, emoji + GIF picker + favorites
- Custom **server emoji** in picker + reactions + message render
- Markdown (`**bold**`, *italic*, `code`, spoilers, quotes)
- Role-grouped member list + live presence
- Role colors on authors + members
- Unread vs mention channel styling
- Avatar → mini profile popover
- Date separators (Today / Yesterday)
- Collapsible channel categories
- Delete message (bot Manage Messages)
- Mobile long-press, bottom-sheet emoji, touch targets
- Media proxy (images / GIFs / PFPs)

## Current focus — Phase 1

**Streaks + daily loops**
- Tracking, `/daily` hook, website current + longest
- Configurable sources, multipliers, grace days
- Ship in Discord **and** on the website before Phase 2
