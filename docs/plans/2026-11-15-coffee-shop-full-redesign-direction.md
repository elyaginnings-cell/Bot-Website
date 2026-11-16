# Coffee Shop Dashboard — Full Redesign Direction

## Intent
- Page kind: full application overhaul, not a palette-only reskin.
- Audience: Discord server owners and moderators configuring systems, checking server status, and managing an account.
- Direction: a welcoming neighborhood coffeehouse with a little vintage character; practical, calm, polished, and highly legible.
- Required: rebuild the dashboard shell, overview, feature-page layouts, account/billing surfaces, and Server View presentation; make mobile a deliberate layout; keep the one Café au Lait / Dark Roast toggle.
- Rejected: recoloring existing components without changing hierarchy; generic SaaS gradient/bento layouts; coffee-cup decoration on every card; an alternate theme picker; changing application behavior to fit the design.
- Preserve: all 222 existing dashboard IDs and JS hooks, all 12 dashboard sections, Server View IDs and interaction roots, auth and guest flows, account and subscription controls, owner billing, saved configuration, server-specific tab preferences, layout preference, draft bar, and all backend/API behavior.

## Direction

### Color
Café au Lait:
- page `#F4EEE4`: warm oat canvas.
- surface `#FFFAF2`: primary paper-white panels.
- raised `#F1E6D6`: grouped controls and secondary panels.
- ink `#35251B`: primary text; contrast 12.71:1 on page and 14.11:1 on surface.
- muted `#6B5A4B`: secondary text; contrast 5.71:1 on page.
- accent `#8C5737`: espresso/caramel action; contrast 5.72:1 on surface.
- focus `#2F6F68`: deep café-green focus ring; contrast 5.62:1 on surface.
- line `#D8C9B7`: panel separation; use a stronger boundary where 3:1 is required.
- success `#286548`, warning `#80531E`, danger `#A43E37`.

Dark Roast:
- page `#211A16`: deep roasted coffee canvas.
- surface `#2D241E`: primary panel.
- raised `#3A2D24`: grouped control surface.
- ink `#F8EEE1`: primary text; contrast 14.96:1 on page and 13.24:1 on surface.
- muted `#C7B7A4`: secondary text; contrast 8.77:1 on page.
- accent `#D9A16F`: warm copper action; contrast 6.71:1 on surface.
- focus `#9DC9C1`: pale café-green focus ring; contrast 8.36:1 on surface.
- line `#514237`; success `#8DD4A7`, warning `#E5BC78`, danger `#F0A09A`.

Use semantic tokens for text, background, borders, controls, focus, and status. Do not use low-contrast muted text for essential labels. No decorative gradients as a substitute for hierarchy.

### Typography
- Display/headings: Georgia, serif; 600 weight; h1 30/36px desktop and 25/31px mobile; h2 23/30px; h3 16/23px; tracking -0.025em. A restrained vintage editorial cue.
- Body/UI: Inter, system-ui, sans-serif; 14/21px desktop and 14/20px mobile; controls 14px; helper text 12/18px; labels 12/16px at 600 weight.
- Numeric utility: system-ui with tabular numbers; 20–28px values, 700 weight, consistent baseline.
- Maximum reading measure 72ch; configuration controls should not stretch across the entire desktop workspace.

### Layout
- Family: fixed café counter navigation + flexible worktop workspace. The app reads as a purpose-built control room, not a website landing page.
- Desktop (>=1100px): 252px left navigation rail; 28px outer workspace gutter; content max 1320px; 24px between major blocks; 16px panel padding/gaps.
- Tablet (769–1099px): 216px navigation rail; 20px workspace gutter; cards and form grids reduce to two columns where content permits.
- Mobile (<=768px): top bar with menu control, title and theme control; navigation becomes a full-height accessible drawer; workspace has 16px gutters; one-column form flow; bottom draft bar respects safe-area inset; no horizontal scrolling.
- Small mobile (<=420px): controls wrap into full-width rows; two-column stats only when each tile remains >=140px, otherwise one column; long labels wrap.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40px; spacing is owned by shell, section, panel, and control layers respectively.
- Shapes: 10px controls, 14px standard panels, 18px feature panels; subtle 1px borders; low soft shadow only on floating/drawer surfaces.
- Focus: 2px focus token with 2px offset; visible for keyboard navigation. Respect reduced motion.

### Ordered inventory
1. App shell: brand lockup, navigation groups, account/status footer, mobile drawer.
2. Workspace top bar: page title and description, theme toggle, layout mode, Server View shortcut, account profile and logout.
3. Selected-server service ticket: server icon/name, selected-server state, server chooser. This is the single signature element.
4. Page content:
   - Overview: welcome heading, server metrics, quick links, current configuration/status summary. Only source-backed values; retain current values and IDs.
   - Moderation: page heading, one focused warning-log channel panel, save/status.
   - Invites: heading, leaderboard channel panel, save/status.
   - Leveling: enable/message/Beans controls, XP and cooldown group, Beans formula group, formula preview, level-role editor/list.
   - Currency: enable/name identity, daily rewards, work rewards, chat earnings, coinflip controls.
   - Custom emojis: name/category/source/upload, import preview, save/status, existing library.
   - Shop: enable/save, item builder, conditional fields, item list.
   - Logs: destination, save, test-log action/status.
   - Birthday: short description, announcement and role settings, bonus Beans, save/status.
   - Settings: dashboard tab visibility, branding, bot presence.
   - Account: plan/subscription summary, storage meter, billing actions, profile, connected servers, plans, invoices.
   - Owner billing: plan editor and customer oversight.
5. Server View: top bar, channel/member navigation, chat header, settings, messages, reply bar, composer, lightbox.
6. Global overlays: guest account bar/modal, unsaved changes bar, dropdowns, feedback.
7. Boot/loading/fallback: café identity, stable layout and readable loading state.

GAP: The current repository does not provide trustworthy live activity history or a separate per-feature health feed for the overview. Do not fabricate charts, activity, counts, or health statuses. Keep the existing source-backed member/online/role/storage values and make space for actual feature summaries only where the existing scripts expose them.

### Signature
- What: the selected-server service ticket, directly below the workspace top bar. A 4px espresso/copper left rule, compact server icon in a 40px square, overline "WORKING IN", strong server name, helper "Server configuration", and server chooser aligned right. 68px minimum height desktop; on mobile it becomes a compact single-row server selector with the chooser full-width only when necessary.
- Why: every settings action is scoped to a selected Discord server. The ticket keeps that scope visible, just as a café order ticket keeps the current order visible. It is not a generic metric card.
- Motion: no looping animation; chooser gets a 120ms color/border transition. Reduced-motion removes transitions.

### Interactions
- Sidebar groups: Overview; Server systems (Moderation, Invites, Leveling, Currency, Emojis, Shop, Birthday, Logs); Workspace (Settings, Account, Owner Billing when authorized); Server View as a separate destination. Preserve existing data-tab values and visibility preferences.
- Mobile menu button opens a drawer; backdrop and Escape close it; focus remains manageable and button exposes aria-expanded.
- Active page title/description follows existing navigation state. Do not change routing or save semantics.
- Theme toggle remains a single top-bar control, persists existing `coffeeShopTheme` preference.
- Server chooser retains existing click/selection behavior.
- Forms preserve all existing IDs, labels, input types, options, and save handlers. Add layout wrappers only; no renaming selectors or changing form values.
- Save/status feedback remains associated with the correct feature. Unsaved changes bar remains fixed and accessible.
- Server View interactions, message polling, channel selection, reply, member loading, and composer are not changed.

### Wireframes

Desktop 1440:
```
┌──────────────────────┬──────────────────────────────────────────────────────────────┐
│ Coffee Shop          │ Overview     description      theme  view  server  account   │
│                      ├──────────────────────────────────────────────────────────────┤
│ OVERVIEW             │ ┃ ☕  WORKING IN  Selected server                 Choose ▾   │
│                      ├──────────────────────────────────────────────────────────────┤
│ SERVER SYSTEMS       │ Overview                                                        │
│  Moderation          │ Welcome heading + short explanation                           │
│  Invites             │ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  Leveling            │ │ Members    │ │ Online     │ │ Role       │ │ Storage    │  │
│  Currency            │ └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│  Custom emojis       │ Quick actions and source-backed system summaries               │
│  Shop                │                                                                │
│  Birthday            │ Feature heading + explanatory copy                            │
│  Logs                │ ┌──────────────────────────────┐ ┌──────────────────────────┐ │
│                      │ │ Main settings group          │ │ Secondary settings      │ │
│ WORKSPACE            │ │ controls / inputs             │ │ related help/status     │ │
│  Settings            │ └──────────────────────────────┘ └──────────────────────────┘ │
│  Account             │                                                                │
│  Owner billing       │                                                                │
│                      │                                                                │
│  Server View         │                                                                │
│  Account / status    │                                                                │
└──────────────────────┴──────────────────────────────────────────────────────────────┘
```

Mobile 375:
```
┌───────────────────────────────────┐
│ ☰  Coffee Shop     ☀  Account     │
├───────────────────────────────────┤
│ Overview                          │
│ Manage your Discord server        │
├───────────────────────────────────┤
│ ☕  Working in: Server name    ▾  │
├───────────────────────────────────┤
│ Members              Online       │
│ 1,234                128          │
│ Role                 Storage      │
│ Owner                —            │
├───────────────────────────────────┤
│ Quick actions                     │
│ [Currency] [Shop] [Logs]          │
├───────────────────────────────────┤
│ Feature heading                   │
│ Explanatory copy                  │
│ ┌───────────────────────────────┐ │
│ │ Settings group                │ │
│ │ Label                         │ │
│ │ [Full-width control         ] │ │
│ │ Label                         │ │
│ │ [Full-width control         ] │ │
│ │ [Save changes               ] │ │
│ └───────────────────────────────┘ │
└───────────────────────────────────┘
```
Illustrative wireframe numbers are layout placeholders only, not product data. Real metrics remain sourced from existing dashboard IDs.

## Tried
- Palette-only reskin: rejected because it preserves the current hierarchy, component sprawl, and mobile compromise.
- Generic SaaS bento dashboard: rejected because the product's core task is server-scoped configuration; the selected-server ticket and task-group navigation are more appropriate.
- Overdecorated café theme: rejected because it competes with dense configuration controls and hurts scan speed.
- Dark-only neon interface: rejected because the brief calls for a warm coffeehouse and a coordinated manual dark theme.

## Critique
1. Subject substitution: considered generic project-management admin, ecommerce admin, and chat moderation console. A generic metric dashboard could substitute into any of these, so the chosen layout instead anchors around the server-scoped service ticket and task groups. The selected-server scope is the product-specific property; absent a separate trusted activity feed, no invented timeline or analytics visualization is added.
2. Default clusters: rejected centered hero + equal-card bento as the primary structure, generic gradient SaaS, decorative sequence numbers, and coffee cup motifs repeated on every card. The workspace is a side-navigation control room with form groups and one distinctive service ticket.
3. Free axes: palette is brief-pinned; typography is subject-derived (editorial serif headings for the vintage café, neutral sans-serif controls for scanability); layout is subject-derived from server-scoped configuration; motion is deliberately minimal; imagery is omitted because real server data should remain primary; radius and icon style are restrained conventions, not identity devices.
4. Concentration: removing the selected-server ticket removes the one café-specific identity element. Other café styling is surface tone and small wordmark treatment only.
5. Arithmetic: WCAG text contrast values above are calculated from the stated hex pairs. Layout widths sum within desktop viewport: 252px rail + 28px left/right workspace gutters + 24px gap + 1320px max content is capped by remaining viewport width; mobile 375px with 16px gutters leaves 343px content width. No required controls are hidden on mobile. All existing data and IDs remain.
