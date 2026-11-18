import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../coffee-shop-theme.js", import.meta.url), "utf8");

function createEnvironment(initial = {}) {
  const values = new Map(Object.entries(initial));
  const listeners = [];
  const button = {
    dataset: {},
    attributes: {},
    textContent: "",
    title: "",
    addEventListener(type, handler) { listeners.push({ type, handler }); },
    setAttribute(name, value) { this.attributes[name] = value; }
  };
  const document = {
    readyState: "complete",
    body: { dataset: {} },
    documentElement: { style: {}, dataset: {} },
    getElementById(id) { return id === "coffee-shop-theme-toggle" ? button : null; }
  };
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
  const window = { localStorage };
  vm.runInNewContext(source, { window, document, localStorage });
  return { window, document, button, values, listeners };
}

test("theme defaults to Café au Lait when no preference is saved", () => {
  const env = createEnvironment();
  assert.equal(env.window.CoffeeShopTheme.getTheme(), "cafe");
  assert.equal(env.document.body.dataset.coffeeTheme, "cafe");
  assert.equal(env.document.documentElement.dataset.coffeeTheme, "cafe");
  assert.equal(env.document.documentElement.style.colorScheme, "light");
  assert.equal(env.values.get("coffeeShopTheme"), "cafe");
});

test("theme restores a saved Dark Roast preference", () => {
  const env = createEnvironment({ coffeeShopTheme: "dark-roast" });
  assert.equal(env.window.CoffeeShopTheme.getTheme(), "dark-roast");
  assert.equal(env.document.body.dataset.coffeeTheme, "dark-roast");
  assert.equal(env.document.documentElement.dataset.coffeeTheme, "dark-roast");
  assert.equal(env.document.documentElement.style.colorScheme, "dark");
  assert.equal(env.button.attributes["aria-pressed"], "true");
  assert.match(env.button.textContent, /Dark Roast/);
});

test("invalid saved values safely fall back to Café au Lait", () => {
  const env = createEnvironment({ coffeeShopTheme: "garden" });
  assert.equal(env.window.CoffeeShopTheme.getTheme(), "cafe");
  assert.equal(env.values.get("coffeeShopTheme"), "cafe");
});

test("setTheme updates the document, accessible control, and persistence", () => {
  const env = createEnvironment();
  assert.equal(env.window.CoffeeShopTheme.setTheme("dark-roast"), "dark-roast");
  assert.equal(env.document.body.dataset.coffeeTheme, "dark-roast");
  assert.equal(env.document.documentElement.dataset.coffeeTheme, "dark-roast");
  assert.equal(env.button.attributes["aria-pressed"], "true");
  assert.match(env.button.attributes["aria-label"], /Café au Lait/);
  assert.equal(env.values.get("coffeeShopTheme"), "dark-roast");
  env.window.CoffeeShopTheme.setTheme("cafe");
  assert.equal(env.button.attributes["aria-pressed"], "false");
  assert.match(env.button.attributes["aria-label"], /Dark Roast/);
});

test("toggleTheme alternates both themes and persists each selection", () => {
  const env = createEnvironment();
  assert.equal(env.window.CoffeeShopTheme.toggleTheme(), "dark-roast");
  assert.equal(env.values.get("coffeeShopTheme"), "dark-roast");
  assert.equal(env.window.CoffeeShopTheme.toggleTheme(), "cafe");
  assert.equal(env.values.get("coffeeShopTheme"), "cafe");
});

test("repeated init calls do not bind duplicate click handlers", () => {
  const env = createEnvironment();
  env.window.CoffeeShopTheme.init();
  env.window.CoffeeShopTheme.init();
  assert.equal(env.listeners.filter(item => item.type === "click").length, 1);
  env.listeners[0].handler();
  assert.equal(env.document.body.dataset.coffeeTheme, "dark-roast");
});

import { readFileSync as readText } from "node:fs";
const dashboardMarkup = readText(new URL("../dashboard.html", import.meta.url), "utf8");
const dashboardStyles = readText(new URL("../coffee-shop-dashboard.css", import.meta.url), "utf8");
const serverViewStyles = readText(new URL("../coffee-shop-server-view.css", import.meta.url), "utf8");
const menuRedesignStyles = readText(new URL("../coffee-shop-menu-redesign.css", import.meta.url), "utf8");

test("dashboard exposes exactly one theme toggle and preserves the layout selector", () => {
  assert.equal((dashboardMarkup.match(/id="coffee-shop-theme-toggle"/g) || []).length, 1);
  assert.match(dashboardMarkup, /id="view-mode"/);
  assert.match(dashboardMarkup, /id="server-view"/);
  assert.match(dashboardMarkup, /id="dashboard-draft-bar"/);
  assert.match(dashboardMarkup, /id="customer-billing-portal"/);
});

test("dashboard design system defines both coordinated palettes and core shell styles", () => {
  assert.match(dashboardStyles, /body\[data-coffee-theme="cafe"\]/);
  assert.match(dashboardStyles, /body\[data-coffee-theme="dark-roast"\]/);
  for (const token of ["--coffee-page", "--coffee-surface", "--coffee-ink", "--coffee-muted", "--coffee-accent", "--coffee-line", "--coffee-focus"]) {
    assert.ok(dashboardStyles.includes(token), "missing design token " + token);
  }
  for (const selector of [".sidebar", ".navigation", ".header", ".server-bar", ".form-card", ".button", ".customer-plan-card", ".dashboard-draft-bar"]) {
    assert.ok(dashboardStyles.includes(selector), "missing dashboard component " + selector);
  }
  for (const overlay of [".guest-auth-bar", ".guest-auth-card", ".feature-summary-panel", ".custom-emoji-row", ".ds-nav-group-toggle", ".ds-nav-search"]) {
    assert.ok(dashboardStyles.includes(overlay), "missing themed dashboard surface " + overlay);
  }

});

test("Server View inherits the two shared themes and retains its familiar controls", () => {
  assert.match(serverViewStyles, /body\[data-coffee-theme="cafe"\] #server-view/);
  assert.match(serverViewStyles, /body\[data-coffee-theme="dark-roast"\] #server-view/);
  for (const id of ["sv-channel-list", "sv-messages", "sv-member-panel", "sv-reply-bar", "sv-composer", "sv-settings-panel"]) {
    assert.ok(dashboardMarkup.includes('id="' + id + '"'), "missing Server View root " + id);
  }
  const serverMarkup = dashboardMarkup.split('<div id="server-view"')[1].split('</div>\n    </div>')[0];
  assert.ok(!/theme-(?:garden|midnight|ash|blurple|amoled|nord|dracula|catppuccin)/i.test(serverMarkup));
  assert.match(dashboardStyles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important;/);
  assert.match(dashboardStyles, /max-height: min\(42vh, 360px\)/);
});

const bootloaderMarkup = readText(new URL("../index.html", import.meta.url), "utf8");
const legacyThemeCleanup = readText(new URL("../theme-boot.js", import.meta.url), "utf8");

test("bootloader loads the shared theme assets after legacy styles", () => {
  assert.match(bootloaderMarkup, /coffee-shop-dashboard\.css\?v=1/);
  assert.match(bootloaderMarkup, /coffee-shop-server-view\.css\?v=1/);
  assert.match(dashboardMarkup, /coffee-shop-theme\.js\?v=1/);
  assert.match(bootloaderMarkup, /theme-boot\.js\?v=19/);
  assert.match(bootloaderMarkup, /background:#f5efe5/);
  assert.match(bootloaderMarkup, /background:#fffaf2/);
  assert.ok(bootloaderMarkup.indexOf("/server-view-overhaul.css?v=1") < bootloaderMarkup.indexOf("/coffee-shop-dashboard.css?v=1"));
  assert.ok(bootloaderMarkup.indexOf("/coffee-shop-server-view.css?v=1") < bootloaderMarkup.indexOf("/features-ui.js?v=10"));
});

test("legacy theme picker stays removed while the compatibility cleanup remains active", () => {
  for (const selector of ['#theme-fab', '#themes', '#theme-dropdown-wrap', '#dashboard-theme', '#themes-grid']) {
    assert.ok(!dashboardMarkup.includes(selector), "legacy theme picker remains in dashboard markup: " + selector);
    assert.ok(legacyThemeCleanup.includes(selector), "legacy cleanup no longer removes " + selector);
  }
  assert.ok(!/theme-(?:garden|midnight|ash|blurple|amoled|nord|dracula|catppuccin)/i.test(dashboardMarkup));
  assert.ok(legacyThemeCleanup.includes('server-view-theme-garden'));
  assert.ok(legacyThemeCleanup.includes('server-view-themes-extra'));
});

test("Dark Roast styles the complete menu surface, including shortcuts and page backdrop", () => {
  assert.match(menuRedesignStyles, /html\\[data-coffee-theme="dark-roast"\\]/);
  assert.match(menuRedesignStyles, /body\\[data-coffee-theme="dark-roast"\\] #app \.cafe-shortcut\\s*\\{[^}]*background:#3a281c/i);
  assert.match(menuRedesignStyles, /body\\[data-coffee-theme="dark-roast"\\] #app \.cafe-shortcut strong\\s*\\{[^}]*color:#f4e2cf/i);
  assert.match(menuRedesignStyles, /body\\[data-coffee-theme="dark-roast"\\] #app \.cafe-shortcut p\\s*\\{[^}]*color:#d2b59b/i);
  assert.match(menuRedesignStyles, /background-attachment:fixed/);
});
