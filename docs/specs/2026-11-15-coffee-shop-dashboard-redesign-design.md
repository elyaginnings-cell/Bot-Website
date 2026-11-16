# Coffee Shop Dashboard Redesign

Date: 2026-11-15
Repository: `elyaginnings-cell/Bot-Website`
Target branch: `main`

## Status and intent

The visual direction has been approved by the project owner. This document defines the design before implementation. The work is a full dashboard visual and layout redesign, not a backend rewrite.

## Product goals

- Make the dashboard feel like a polished, welcoming neighborhood coffeehouse.
- Improve hierarchy, readability, consistency, and ease of use.
- Design mobile layouts intentionally rather than compressing desktop layouts.
- Apply one coherent visual system to every dashboard area, including Server View.
- Preserve existing functionality, saved configuration, accounts, and monetization architecture.

## Visual identity

### Café au Lait (light)

Use warm oat, cream, and parchment as the primary surfaces; espresso brown for primary text; caramel and muted antique brass for restrained accents. Use subtle vintage/café-inspired details, soft borders, and restrained shadows. Decorative motifs must never compete with labels, controls, or content.

### Dark Roast (dark)

Provide a coordinated dark theme using deep chocolate and roasted-coffee surfaces, soft cream text, and muted copper/caramel highlights. Maintain comfortable contrast and the same component hierarchy as light mode.

### Theme control

- Replace the legacy theme picker/changer entirely.
- Provide exactly one compact two-state toggle in the dashboard top bar: Café au Lait / Dark Roast.
- Persist the selected preference across visits using the existing appropriate preference mechanism where possible.
- Apply the selected theme consistently to all dashboard sections and Server View.
- Remove obsolete theme options and controls, including legacy Garden/theme choices.
- Do not add automatic device-theme switching; the user explicitly requested a manual toggle.

## Layout and interaction design

### Dashboard shell

Create a consistent application shell with clear navigation, page titles, section labels, and content hierarchy. Use consistent spacing, typography, borders, buttons, inputs, dropdowns, switches, feedback states, and save indicators. Reduce competing visual treatments and redundant decoration.

### Configuration pages

Make configuration panels easy to scan, with clear grouping, readable labels, concise supporting text, and predictable action placement. Preserve the existing save/draft workflow and clearly distinguish saved state from unsaved edits. Do not change configuration semantics or silently discard drafts.

### Server View

Retain the familiar Discord-style chat information architecture and expected interaction patterns. Restyle the surrounding surfaces, channel list, messages, member list, and controls to match both café themes. Keep chat content highly readable and interaction targets usable. Mobile Server View must receive a deliberate layout with appropriate navigation and chat space, not merely scaled desktop columns.

### Responsive behavior

Use mobile-first layout decisions where practical. At narrow widths, navigation, toolbars, forms, tables, configuration panels, and Server View must remain usable without horizontal overflow or clipped controls. Preserve desktop efficiency and information density where appropriate.

## Technical approach and boundaries

The current dashboard loads multiple overlapping CSS layers, including base styles, dashboard refinements, mobile fixes, preferences styles, and specialized Server View styles. Implementation should consolidate and rationalize the app-wide visual system where safe, rather than layering on another collection of one-off overrides.

Preserve:
- Existing HTML IDs, data attributes, and JavaScript selectors/hooks.
- Existing script loading and bootloader behavior unless a narrowly scoped visual change requires adjustment.
- All dashboard sections and their current functionality.
- Server View behavior and chat interactions.
- Authentication, account/profile flows, billing/subscription flows, owner controls, and monetization architecture.
- API contracts, backend behavior, database schema, stored records, guild configuration, and saved user preferences unrelated to theme.
- Existing save handlers, draft protection, and configuration persistence.

Do not reset, migrate destructively, or delete database records. Do not deploy the Railway bot as part of this visual redesign. Do not implement payment or pricing changes as part of this scope.

## Implementation sequence

1. Inspect the current main-branch markup, CSS cascade, scripts, and theme preference behavior before editing.
2. Map the existing dashboard sections and Server View components to the new design tokens.
3. Implement the shared design tokens and theme persistence/control.
4. Redesign the dashboard shell, navigation, controls, and configuration surfaces.
5. Redesign Server View in both themes, including mobile behavior.
6. Remove obsolete theme picker UI and obsolete theme options without breaking required compatibility.
7. Verify desktop and mobile layouts, both themes, navigation, Server View interactions, and representative configuration/save flows.
8. Deploy the dashboard only after the user has had an opportunity to review the implementation, following the project's established deployment workflow.

## Acceptance criteria

- The dashboard visibly reads as a cohesive, professional coffeehouse-inspired product.
- Café au Lait and Dark Roast both have legible text, clear control states, and consistent styling.
- A single manual top-bar toggle switches between the two themes.
- The chosen theme persists across visits.
- No legacy theme picker or obsolete theme choices remain in the UI.
- Every dashboard section and Server View follows the chosen theme.
- Server View retains its familiar chat structure and remains usable on desktop and mobile.
- No existing dashboard sections, settings, account/billing flows, save behavior, or stored data are lost.
- No new horizontal overflow, clipped controls, broken navigation, or regressions in key interactions are introduced.
- Verification claims distinguish automated/static checks from authenticated browser testing that has not been performed.
