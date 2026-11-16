# Coffee Shop Dashboard Redesign Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a cohesive, mobile-first Coffee Shop dashboard in Café au Lait and Dark Roast, with one persistent manual theme toggle shared by the dashboard and Server View.

**Architecture:** Keep the existing dashboard markup, scripts, API routes, save handlers, and backend contracts intact. Add a small browser-side theme controller that owns the single persisted preference, then make the dashboard and Server View consume shared semantic design tokens through focused CSS entry points. Rationalize conflicting legacy visual rules without deleting structural styles or changing the existing layout-mode preference.

**Tech Stack:** HTML, CSS, vanilla browser JavaScript, Node.js 24, Node's built-in test runner, GitHub Contents API, and the existing Vercel deployment workflow.

## Global Constraints

- The visual direction is a cozy café with a little vintage: warm oat, cream, parchment, espresso brown, caramel, and restrained antique-brass details.
- Café au Lait is the light theme. Dark Roast uses deep chocolate and roasted-coffee surfaces, soft cream text, and muted copper/caramel highlights.
- Provide exactly one compact two-state manual theme toggle in the dashboard top bar. Persist its selection across visits. Do not add automatic device-theme switching.
- Remove the legacy theme picker/changer and all obsolete theme choices, including Garden and any other legacy palette options. Do not leave a second theme control in Server View.
- Apply both themes consistently to every dashboard section and Server View.
- Keep Server View's familiar Discord-style chat information architecture and interactions.
- Design mobile deliberately; do not merely scale or stack desktop controls without considering navigation, content width, touch targets, and safe areas.
- Preserve existing HTML IDs, data attributes, JavaScript selectors/hooks, dashboard sections, authentication, account/profile flows, billing/subscription flows, owner controls, API contracts, backend behavior, database schema and records, guild configuration, saved preferences unrelated to theme, save handlers, and draft protection.
- Keep the existing View selector and its `dashboardViewMode` behavior separate from the theme toggle.
- Do not reset or destructively migrate data. Do not deploy the Railway bot. Do not implement pricing or payment changes.
- Deploy the dashboard only after the user has had an opportunity to review the implementation.

---

### Task 1: Add the shared persistent theme controller and top-bar toggle

**Files:**
- Create: `coffee-shop-theme.js`
- Modify: `dashboard.html`
- Create: `tests/coffee-shop-theme.test.js`

**Interfaces:**
- Produces browser global `window.CoffeeShopTheme` with `getTheme()`, `setTheme(theme)`, `toggleTheme()`, and `init()`.
- Theme values are exactly `"cafe"` and `"dark-roast"`.
- Persists under localStorage key `coffeeShopTheme`.
- The body exposes the active value through `data-coffee-theme`; the Server View inherits the same theme from the document body.
- The header control uses stable ID `coffee-shop-theme-toggle`, is a real button, and exposes its current state accessibly with an updated label and `aria-pressed`.

- [ ] **Step 1: Add focused failing tests**

Use Node's built-in `node:test` and `node:vm` with a minimal fake document, button, and localStorage. Assert: missing preference defaults to `cafe`; a valid stored `dark-roast` preference is restored; invalid stored values fall back to `cafe`; `setTheme` updates the body dataset, color scheme, button label and pressed state; `toggleTheme` alternates both ways and persists the result; repeated `init()` calls do not register duplicate click handlers.

- [ ] **Step 2: Verify the relevant failure**

Run: `node --test tests/coffee-shop-theme.test.js`

Expected: the test file initially fails because the theme controller and top-bar control do not yet exist.

- [ ] **Step 3: Implement the minimum behavior**

Implement a dependency-free IIFE in `coffee-shop-theme.js`. Accept only the two defined values, use `cafe` as the safe default, apply the state to `document.body.dataset.coffeeTheme`, update `document.documentElement.style.colorScheme`, update the button's accessible label and `aria-pressed`, persist with localStorage, and guard event binding against duplicate initialization. Add the single compact toggle to the existing `.header-actions` in `dashboard.html`. Load the controller after the dashboard markup is present and before the dashboard becomes interactive. Do not change `initViewMode()` or the `dashboardViewMode` key.

- [ ] **Step 4: Verify the focused pass**

Run: `node --test tests/coffee-shop-theme.test.js`

Expected: all theme controller tests pass, including persistence and duplicate-init coverage.

- [ ] **Step 5: Run the affected integration check**

Run: `node --test`

Expected: all existing dashboard-tab, schema-lock, and subscription tests continue to pass alongside the new theme tests.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add coffee-shop-theme.js dashboard.html tests/coffee-shop-theme.test.js
git commit -m "feat: add persistent coffee shop theme toggle"
```

### Task 2: Redesign the dashboard shell, navigation, and configuration surfaces

**Files:**
- Create: `coffee-shop-dashboard.css`
- Modify: `dashboard.html`
- Modify: `style.css`
- Modify: `refined-dashboard.css`
- Modify: `mobile-fix.css`
- Modify: `dashboard-preferences.css`
- Modify: `customer-platform.css`
- Modify: `index.html`

**Interfaces:**
- Consumes `body[data-coffee-theme="cafe"]` and `body[data-coffee-theme="dark-roast"]` from Task 1.
- Defines shared semantic custom properties for page background, surfaces, raised surfaces, text, muted text, borders, accent, focus, status colors, radii, and shadows.
- Preserves existing dashboard markup contracts and selectors, including `#app`, `.sidebar`, `.navigation`, `.nav-item`, `.header`, `.server-bar`, `.content`, `.page-section`, `.card`, `.form-card`, `.input-group`, `.button`, `.toggle`, account controls, customer billing controls, and the draft bar.

- [ ] **Step 1: Add focused failing tests**

Extend the theme tests with static assertions that both theme token blocks exist, required shell selectors are styled from semantic tokens, the theme toggle is present exactly once, and the existing `#view-mode` control remains present. Add assertions that all dashboard sections and account/billing roots remain in `dashboard.html`.

- [ ] **Step 2: Verify the relevant failure**

Run: `node --test tests/coffee-shop-theme.test.js`

Expected: the new markup and stylesheet assertions fail before the redesign is implemented.

- [ ] **Step 3: Implement the minimum behavior**

Create `coffee-shop-dashboard.css` as the cohesive dashboard visual system. Give Café au Lait and Dark Roast complete semantic token sets with readable foreground/background pairs. Restyle the shell, sidebar, navigation, header, server selector, overview cards, forms, inputs, buttons, dropdowns, toggles, status feedback, account and subscription panels, and unsaved-draft bar. Use clear hierarchy, restrained café details, consistent spacing, subtle borders and shadows, visible focus states, and reduced-motion support. At narrow widths, make navigation compact and usable, keep header actions and form controls within the viewport, use sensible single-column form layouts, and preserve safe-area spacing. Rationalize conflicting global color and component declarations in the existing CSS files rather than accumulating another patch stack; retain specialized selectors and structural rules needed by existing feature UIs. Update the boot splash in `index.html` to use the same café identity while retaining its loading and fallback behavior. Do not change tab visibility preferences, server selection, account behavior, or save/draft logic.

- [ ] **Step 4: Verify the focused pass**

Run: `node --test tests/coffee-shop-theme.test.js`

Expected: theme-token and dashboard-markup assertions pass for both themes, the single toggle, and all existing dashboard roots.

- [ ] **Step 5: Run the affected integration check**

Run: `node --test`

Expected: all repository tests pass. Also inspect the generated CSS for duplicate global selectors and confirm no new horizontal overflow rules hide content instead of fixing its layout.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add coffee-shop-dashboard.css dashboard.html style.css refined-dashboard.css mobile-fix.css dashboard-preferences.css customer-platform.css index.html tests/coffee-shop-theme.test.js
git commit -m "feat: redesign dashboard with cafe themes"
```

### Task 3: Bring Server View into the shared café design system

**Files:**
- Create: `coffee-shop-server-view.css`
- Modify: `dashboard.html`
- Modify: `server-view.css`
- Modify: `tests/coffee-shop-theme.test.js`

**Interfaces:**
- Consumes the document body's `data-coffee-theme` and shared semantic tokens from `coffee-shop-dashboard.css`.
- Maps shared tokens to the existing Server View custom properties: `--sv-bg-primary`, `--sv-bg-secondary`, `--sv-bg-tertiary`, `--sv-bg-modifier`, `--sv-text`, `--sv-text-muted`, `--sv-text-link`, `--sv-brand`, `--sv-embed-bg`, `--sv-input-bg`, and `--sv-scrollbar`.
- Preserves existing Server View DOM IDs and channel/message/member/reply/composer behavior. Do not alter the existing density/font-size storage or apply logic, or change the current settings-panel visibility behavior.

- [ ] **Step 1: Add focused failing tests**

Add static tests that both theme selectors map the Server View variables to shared tokens, that the Server View markup retains channel list, messages, member panel, reply bar, composer, and settings IDs, and that no second theme picker is added inside `#server-view`.

- [ ] **Step 2: Verify the relevant failure**

Run: `node --test tests/coffee-shop-theme.test.js`

Expected: Server View token and markup assertions fail before the dedicated stylesheet is added.

- [ ] **Step 3: Implement the minimum behavior**

Create `coffee-shop-server-view.css` to style the top bar, channel rail, category labels, selected and hovered channels, chat header, message groups, avatars, author metadata, message content, links, mentions, embeds, attachments, reply preview, composer, member list, settings panel, menus, scrollbars, and empty/error states using the shared Café au Lait and Dark Roast tokens. Preserve the familiar Discord-like layout and message density options. Rework narrow-screen behavior so the channel drawer, backdrop, member panel, chat area, and composer remain usable without clipped controls or horizontal overflow. Keep one theme source of truth; do not introduce a Server View theme dropdown or a separate preference. Include the stylesheet after the existing Server View styles so its token mappings are authoritative without changing message-rendering JavaScript.

- [ ] **Step 4: Verify the focused pass**

Run: `node --test tests/coffee-shop-theme.test.js`

Expected: both Server View themes map to the shared design system, all existing Server View interaction roots remain present, and only the top-bar toggle controls the theme.

- [ ] **Step 5: Run the affected integration check**

Run: `node --test`

Expected: all repository tests pass. Run `node --check server-view-layout.js` and confirm the task did not change message polling, channel selection, reply, member loading, or composer event logic.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add coffee-shop-server-view.css dashboard.html server-view.css server-view-layout.js tests/coffee-shop-theme.test.js
git commit -m "feat: theme server view for cafe and dark roast"
```

### Task 4: Remove obsolete theme UI and complete regression verification

**Files:**
- Modify: `dashboard.html`
- Modify: `index.html`
- Modify: `theme-boot.js`
- Modify: `coffee-shop-theme.js`
- Modify: `coffee-shop-dashboard.css`
- Modify: `coffee-shop-server-view.css`
- Modify: `tests/coffee-shop-theme.test.js`

**Interfaces:**
- The only supported appearance values are `cafe` and `dark-roast`.
- The only appearance control is `#coffee-shop-theme-toggle`.
- The separate layout preference remains `#view-mode` backed by `dashboardViewMode`.

- [ ] **Step 1: Add focused failing tests**

Add final static assertions that legacy theme-picker controls, obsolete theme names/classes, and theme-specific UI are not present in active dashboard markup or loaded stylesheets; the old Server View density/font-size settings remain; the bootloader still fetches and validates dashboard markup; and all theme references use only the two supported values.

- [ ] **Step 2: Verify the relevant failure**

Run: `node --test tests/coffee-shop-theme.test.js`

Expected: any remaining active legacy theme references are identified by a failing assertion.

- [ ] **Step 3: Implement the minimum behavior**

Remove only obsolete theme-picker markup, event wiring, stylesheet references, and legacy palette selectors that are still active in the dashboard. Extend the existing compatibility cleanup in `theme-boot.js` to remove cached Server View Garden and legacy theme-pack stylesheets, while leaving `coffeeShopTheme` untouched. Do not delete unrelated files or remove the Server View density/font-size controls. Keep the view-mode selector and bootloader replacement/injection behavior intact. Update CSS cache query versions in `dashboard.html` and any versioned asset references in `index.html` where required so deployed clients receive the new design.

- [ ] **Step 4: Verify the focused pass**

Run: `node --test tests/coffee-shop-theme.test.js`

Expected: no obsolete theme UI or choices remain in active dashboard assets; the two theme values, single toggle, layout selector, and Server View preferences remain.

- [ ] **Step 5: Run the affected integration check**

Run: `node --test && node --check coffee-shop-theme.js && node --check script-part1.js && node --check server-view.js && node --check server-view-layout.js`

Expected: all tests and syntax checks pass. Fetch the bootloader and each newly referenced stylesheet/script from the deployed dashboard only after the user approves deployment. Before deployment, perform a desktop/mobile review in both themes and exercise navigation, Server View channel/member/reply/composer interactions, account/billing surfaces, and representative save/draft flows in an authenticated browser session. If authenticated browser access is unavailable, report that limitation rather than claiming those interactions were verified.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add dashboard.html index.html coffee-shop-theme.js coffee-shop-dashboard.css coffee-shop-server-view.css tests/coffee-shop-theme.test.js
git commit -m "chore: remove legacy themes and verify dashboard redesign"
```

## Unresolved product decisions

- None. Theme names, palettes, manual-toggle behavior, persistence, Server View coverage, legacy theme removal, and the boundary between theme selection and layout selection are settled by the approved specification.
