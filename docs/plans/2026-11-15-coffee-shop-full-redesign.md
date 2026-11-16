# Coffee Shop Dashboard Full Redesign Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current reskinned dashboard with a complete, mobile-first Coffee Shop management workspace across every dashboard section and Server View.

**Architecture:** Keep the existing framework-free HTML/CSS/JavaScript architecture and all backend contracts. Rebuild the dashboard shell and page composition around task-group navigation, a selected-server service ticket, structured feature workspaces, and an intentional mobile drawer; preserve existing element IDs and JS hooks while adding wrappers and accessible navigation controls. Apply one shared token system to all dashboard, account, overlay, and Server View surfaces.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node 24, Node's built-in test runner, existing Vercel preview/production deployment.

## Global Constraints

- This is a full information-architecture and interface-layout redesign, not a color-only reskin.
- Implement the approved design in `docs/plans/2026-11-15-coffee-shop-full-redesign-direction.md`.
- Preserve all existing dashboard IDs, data attributes, scripts, APIs, form fields, form values, save handlers, server-specific configuration, auth, account, billing, owner controls, guest preview, draft protection, Server View message/channel/member/reply/composer behavior, and existing view-mode preference.
- Preserve all 12 dashboard sections and every existing feature. Do not invent metrics, activity, customer records, subscription states, feature health, or analytics data.
- Keep one theme toggle only: Café au Lait and Dark Roast. Remove legacy theme picker options; do not add another Server View theme control.
- Mobile is a deliberate drawer-based app layout, not a scaled desktop sidebar. No content or controls may be hidden to make overflow disappear.
- Do not change database schema/records, backend behavior, payment/pricing behavior, or Railway bot deployment.
- Continue implementation on `feature/coffee-shop-dashboard-redesign`; do not commit further implementation to `main` until the production release is intentionally prepared.
- Deploy to production only after the finished redesign passes the declared tests and the user has reviewed the preview.

---

### Task 1: Rebuild the application shell and navigation

**Files:**
- Modify: `dashboard.html`
- Modify: `coffee-shop-dashboard.css`
- Modify: `coffee-shop-theme.js`
- Create: `dashboard-shell.js`
- Modify: `index.html`
- Test: `tests/dashboard-redesign.test.js`

**Interfaces:**
- Preserve existing `#app`, `.sidebar`, `.navigation`, `.main`, `.header`, `.server-bar`, `.content`, and all current dashboard IDs.
- Add `#dashboard-menu-toggle` (button), `#dashboard-nav-backdrop` (button), and `#dashboard-shell` only if needed; the existing `#app` remains the root.
- `window.DashboardShell.init()`, `openNavigation()`, and `closeNavigation()` own only drawer state and Escape/backdrop handling. Existing `script.js` remains the owner of tab navigation.
- Navigation buttons retain their existing `data-tab` values and `id` attributes. Grouping must not change server-specific tab visibility behavior.

- [ ] **Step 1: Add focused failing tests**
  - Assert all 222 pre-redesign dashboard IDs remain present after shell changes.
  - Assert each current section ID remains present once: overview, moderation, invites, leveling, currency, emojis, shop, logs, birthday, settings, account, owner-billing.
  - Assert navigation grouping contains every existing `data-tab` target and Server View shortcut.
  - Assert exactly one theme toggle exists and `#view-mode` remains.
  - Assert mobile menu toggle/backdrop have accessible labels and `aria-expanded`.
  - Add Node VM tests for open/close, Escape, backdrop click, and repeated initialization without duplicate listeners.

- [ ] **Step 2: Verify the relevant failure**
  - Run: `node --test tests/dashboard-redesign.test.js`
  - Expected: missing shell controller, mobile controls, and task-group structure fail.

- [ ] **Step 3: Implement the shell**
  - Restructure the sidebar into four labelled groups: Overview, Server systems, Workspace, and Server View. Preserve every existing nav button, target, and hidden state.
  - Add a compact mobile topbar menu button. The sidebar becomes an off-canvas drawer at <=768px; the backdrop closes it; Escape closes it; focus returns to the menu button; update `aria-expanded` and `aria-controls`.
  - Keep desktop sidebar fixed at 252px; tablet 216px; mobile drawer width min(320px, calc(100vw - 48px)).
  - Rebuild header into a clear workspace bar with page title/description, theme control, layout mode, Server View shortcut, account identity, and logout. Controls wrap intentionally at intermediate widths.
  - Redesign the selected-server area as the service ticket described in the direction spec; preserve `#selected-server-icon`, `#selected-server-name`, `#server-button`, and `#server-list`.
  - Use a clear content max width and stable gutters; preserve the guest auth, draft bar, and app hidden/display semantics.
  - Use the same palette on loading/fallback gate. Bump cache versions for changed assets.

- [ ] **Step 4: Verify the focused pass**
  - Run: `node --test tests/dashboard-redesign.test.js tests/coffee-shop-theme.test.js`
  - Expected: all ID-preservation, navigation grouping, drawer behavior, and theme-toggle tests pass.

- [ ] **Step 5: Integration**
  - Run: `node --test`
  - Expected: all redesign tests pass; record any pre-existing unrelated failure separately and do not mask it.
  - Run `node --check dashboard-shell.js`.
  - Confirm no duplicate IDs and no change to `dashboardViewMode` or `coffeeShopTheme` storage keys.

- [ ] **Step 6: Commit**
  ```bash
  git add dashboard.html dashboard-shell.js coffee-shop-dashboard.css coffee-shop-theme.js index.html tests/dashboard-redesign.test.js
  git commit -m "feat: rebuild coffee shop dashboard shell"
  ```

### Task 2: Recompose overview and all server-system workspaces

**Files:**
- Modify: `dashboard.html`
- Modify: `coffee-shop-dashboard.css`
- Modify: `refined-dashboard.css`
- Modify: `mobile-fix.css`
- Modify: `dashboard-preferences.css`
- Modify: `customer-platform.css`
- Create: `dashboard-sections.css`
- Test: `tests/dashboard-redesign.test.js`

**Interfaces:**
- All existing section IDs and input IDs remain unchanged.
- Existing `data-section-link`, `data-tab`, and feature summary/editor hooks remain unchanged.
- Existing save buttons, status paragraphs, and draft protection keep their current event ownership.

- [ ] **Step 1: Add failing structural tests**
  - Assert each of the 12 page sections has one `.page-heading` with a real title and concise description.
  - Assert overview keeps all four existing metric IDs and all three existing quick links.
  - Assert feature pages use semantic `.settings-layout`, `.settings-panel`, and `.settings-group` wrappers without duplicating or moving IDs outside their owning section.
  - Assert no existing form ID, status ID, or save button disappears.
  - Assert all config groups remain in document order and mobile styles provide one-column form flow.

- [ ] **Step 2: Verify failure**
  - Run: `node --test tests/dashboard-redesign.test.js`
  - Expected: missing page headings, wrappers, and new section layout assertions fail.

- [ ] **Step 3: Rebuild page composition**
  - Overview: replace the current generic hero with a compact page introduction, service-ticket context, source-backed metric strip, quick-action list, and existing configuration summary slots only. Do not fabricate analytics or live activity.
  - Moderation and Invites: clear single-task editor panels with explanatory copy, channel selector, save/status row.
  - Leveling: separate progression controls, XP schedule, Beans reward formula/preview, and level-role editor/list into named panels.
  - Currency: separate identity, daily, work, chat earnings, and coinflip panels; preserve all current values and inputs.
  - Custom Emojis: two-column desktop import/editor and library panel; single-column mobile; preview and upload state remain intact.
  - Shop: distinct shop availability, item builder, conditional options, and inventory panel; keep add-item action in its current event flow.
  - Logs: destination editor and separate test-log action panel.
  - Birthday: announcement settings and reward settings.
  - Settings: dashboard tab visibility, site branding, and bot presence as separate named groups.
  - Add page-heading title/description for every section. Use concise task-oriented language, no fabricated capabilities or states.
  - Replace ad-hoc inline spacing with named CSS layout classes; keep every original ID and selector stable.
  - Remove conflicting old CSS declarations only where the new owning stylesheet replaces them; keep structural rules used by feature UI and Server View.
  - Ensure all grids collapse to one column at 768px and all controls remain reachable at 360px.

- [ ] **Step 4: Focused verification**
  - Run: `node --test tests/dashboard-redesign.test.js tests/coffee-shop-theme.test.js`
  - Expected: section structure, preserved IDs, and layout assertions pass.

- [ ] **Step 5: Integration**
  - Run: `node --test`.
  - Expected: no new failures compared with baseline; all new tests pass.
  - Run `node --check script.js` and existing UI scripts to ensure markup restructuring did not change script syntax.
  - Review all 12 sections in source order and verify save/status hooks remain within their original section.

- [ ] **Step 6: Commit**
  ```bash
  git add dashboard.html dashboard-sections.css coffee-shop-dashboard.css refined-dashboard.css mobile-fix.css dashboard-preferences.css customer-platform.css tests/dashboard-redesign.test.js
  git commit -m "feat: redesign dashboard overview and server systems"
  ```

### Task 3: Redesign account, billing, guest access, and owner workspace

**Files:**
- Modify: `dashboard.html`
- Modify: `customer-platform.css`
- Modify: `coffee-shop-dashboard.css`
- Modify: `index.html`
- Test: `tests/dashboard-redesign.test.js`

**Interfaces:**
- Preserve `#customer-account-status`, plan/status/storage IDs, billing portal/cancel/resume buttons, profile fields, Discord linking, server list, plan list, invoice list, owner plan fields, owner customer list, guest auth IDs, and draft bar IDs.
- Preserve customer-platform.js and guest-auth.js API/event ownership.

- [ ] **Step 1: Add failing tests**
  - Assert account workspace has separate plan/storage, identity, connected-server, available-plan, and invoice panels.
  - Assert owner billing has distinct plan editor and customer oversight panels.
  - Assert guest auth bar/modal and draft bar remain outside the app root and retain all IDs.
  - Assert all original account/billing IDs remain present exactly once.

- [ ] **Step 2: Verify failure**
  - Run: `node --test tests/dashboard-redesign.test.js`
  - Expected: current generic card group structure fails the new layout assertions.

- [ ] **Step 3: Implement**
  - Recompose account view into a plan overview with storage meter and billing actions, account identity, connected Discord servers, plan comparison list, and invoice history.
  - Recompose owner billing into a plan editor with grouped pricing/limits/entitlements and a separate customer oversight panel.
  - Redesign guest banner and login/signup modal with clear primary/secondary action hierarchy.
  - Redesign unsaved-draft bar as a readable sticky service notice with Cancel and Save changes actions, safe-area aware on mobile.
  - Do not alter billing logic, price calculations, entitlement logic, auth flows, or any backend/API call.

- [ ] **Step 4: Focused verification**
  - Run: `node --test tests/dashboard-redesign.test.js`
  - Expected: all account, owner, guest, and draft structural assertions pass.

- [ ] **Step 5: Integration**
  - Run: `node --test`.
  - Expected: no new failures; existing subscription tests remain unchanged and pass.
  - Run `node --check customer-platform.js` and `node --check guest-auth.js`.

- [ ] **Step 6: Commit**
  ```bash
  git add dashboard.html customer-platform.css coffee-shop-dashboard.css index.html tests/dashboard-redesign.test.js
  git commit -m "feat: redesign account and billing workspaces"
  ```

### Task 4: Redesign Server View and finish cross-application consistency

**Files:**
- Modify: `dashboard.html`
- Modify: `coffee-shop-server-view.css`
- Modify: `server-view.css` only for conflicting ownership rules
- Test: `tests/dashboard-redesign.test.js`

**Interfaces:**
- Preserve all Server View IDs, channel/message/member/reply/composer interactions, `svDensity` and `svFontSize` preferences, and the single shared theme source.
- Do not change message polling, API requests, channel selection, reply handling, member loading, or composer behavior.

- [ ] **Step 1: Add failing tests**
  - Assert Server View retains every original ID and has the intended workspace structure.
  - Assert no second theme selector exists in Server View.
  - Assert mobile drawer, chat area, member panel, reply bar, and composer all have responsive layout ownership.

- [ ] **Step 2: Verify failure**
  - Run: `node --test tests/dashboard-redesign.test.js`
  - Expected: new structural and responsive ownership assertions fail.

- [ ] **Step 3: Implement**
  - Rebuild Server View top bar and workspace framing to match the café control room while keeping familiar channel/chat/member information architecture.
  - Add clear selected channel header, channel/member drawer controls, readable message grouping, reply preview, composer, settings panel, and lightbox.
  - Keep Server View theme inherited from document body; keep density and font-size preferences unchanged.
  - At mobile widths, use the existing channel drawer interaction and preserve member view switching; ensure composer and reply controls remain visible above safe area.

- [ ] **Step 4: Focused verification**
  - Run: `node --test tests/dashboard-redesign.test.js tests/coffee-shop-theme.test.js`
  - Expected: Server View structure, shared theme, and preserved IDs pass.

- [ ] **Step 5: Integration**
  - Run: `node --test`.
  - Expected: no new failures; all redesign assertions pass.
  - Run `node --check server-view.js` and `node --check server-view-layout.js`.

- [ ] **Step 6: Commit**
  ```bash
  git add dashboard.html coffee-shop-server-view.css server-view.css tests/dashboard-redesign.test.js
  git commit -m "feat: redesign server view workspace"
  ```

### Task 5: Verify responsive renders and prepare production release

**Files:**
- Modify: cache versions in `index.html` and `dashboard.html`
- Test: `tests/dashboard-redesign.test.js` and the full repository test suite

**Interfaces:**
- Production artifact is the tested `feature/coffee-shop-dashboard-redesign` commit merged or deployed to the existing `bot-website` Vercel project.
- No production release occurs until the preview has been reviewed by the user.

- [ ] **Step 1: Run frozen checks**
  - Desktop: 1440x900 and 1280x800.
  - Intermediate: 1024x768 and 768x1024.
  - Mobile: 390x844 and 360x800.
  - Check all 12 sections, account/guest states, owner billing visibility, Server View, open drawer, and unsaved draft bar.
  - Verify no horizontal overflow, no clipped controls, keyboard focus, readable contrast, theme parity, reduced motion, and touch target size.
- [ ] **Step 2: Run tests**
  - Run: `npm test`.
  - Expected: all new tests pass and any pre-existing failure is identified separately.
- [ ] **Step 3: Inspect structural changes**
  - Review all touched UI files for ID/selector preservation and CSS token ownership.
  - Verify no duplicate IDs, removed fields, altered data-tab names, or changed event handlers.
- [ ] **Step 4: Prepare production**
  - Build/deploy the reviewed commit to the existing Vercel production project.
  - Verify deployment reaches READY and fetch the production HTML and versioned CSS/JS assets with HTTP 200.
  - Do not deploy Railway bot, change database, or touch billing backend.
