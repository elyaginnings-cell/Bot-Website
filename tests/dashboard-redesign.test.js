import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../dashboard.html", import.meta.url), "utf8");
const bootloader = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const shellCss = readFileSync(new URL("../coffee-shop-dashboard.css", import.meta.url), "utf8");
const serverViewCss = readFileSync(new URL("../coffee-shop-server-view.css", import.meta.url), "utf8");
const sectionCss = (() => { try { return readFileSync(new URL("../dashboard-sections.css", import.meta.url), "utf8"); } catch { return ""; } })();
const mobileCss = readFileSync(new URL("../coffee-shop-mobile.css", import.meta.url), "utf8");
const controlCenterCss = readFileSync(new URL("../coffee-shop-control-center.css", import.meta.url), "utf8");
const menuRedesignCss = readFileSync(new URL("../coffee-shop-menu-redesign.css", import.meta.url), "utf8");
const navigationScript = readFileSync(new URL("../refined-dashboard.js", import.meta.url), "utf8");
const featureUiScript = readFileSync(new URL("../features-ui.js", import.meta.url), "utf8");
const customEmojiScript = readFileSync(new URL("../features-custom-emojis.js", import.meta.url), "utf8");
const menuPageScript = readFileSync(new URL("../dashboard-menu-page.js", import.meta.url), "utf8");
const featureManagerScript = readFileSync(new URL("../features-systems.js", import.meta.url), "utf8");
const shellScript = (() => { try { return readFileSync(new URL("../dashboard-shell.js", import.meta.url), "utf8"); } catch { return ""; } })();

const sectionIds = ["overview", "moderation", "invites", "leveling", "currency", "emojis", "shop", "logs", "birthday", "settings", "account", "owner-billing"];
const featureIds = [
  "warn-channel", "save-moderation", "moderation-status", "invite-channel", "save-invites", "invites-status",
  "lvl-enabled", "lvl-xp-min", "lvl-xp-max", "lvl-xp-cd", "lvl-beans-base", "lvl-beans-linear", "lvl-beans-quad", "lvl-preview", "save-leveling", "level-roles-list",
  "cur-enabled", "cur-name", "cur-emoji", "cur-daily-min", "cur-daily-max", "cur-work-min", "cur-work-max", "cur-chat-enabled", "cur-flip-enabled", "save-currency",
  "emoji-name", "emoji-category", "emoji-source", "emoji-file", "emoji-import-preview", "save-custom-emoji", "custom-emoji-list",
  "shop-enabled", "shop-type", "shop-name", "shop-price", "shop-role", "shop-items-list", "add-shop-item",
  "dashboard-log-channel", "save-logs", "test-log", "bday-channel", "bday-role", "bday-bonus", "save-birthday",
  "site-name", "save-branding", "bot-status", "save-presence"
];

test("dashboard shell groups navigation without changing tab targets", () => {
  for (const group of ['label:"Overview"', 'label:"Server systems"', 'label:"Workspace"', 'label:"Server View"']) {
    assert.ok(navigationScript.includes(group), "missing navigation group " + group);
  }
  assert.match(navigationScript, /dataset\.navGroup = group\.label/);
  for (const id of sectionIds) {
    if (id === "owner-billing") assert.match(html, /data-tab="owner-billing"/);
    else if (id !== "overview") assert.match(html, new RegExp('data-tab="' + id + '"'));
  }
  assert.match(html, /id="dashboard-menu-toggle"[^>]*aria-expanded="false"/);
  assert.match(bootloader, /dashboard-shell\.js\?v=1/);
  assert.match(html, /id="dashboard-nav-backdrop"/);
  assert.match(html, /aria-controls="dashboard-navigation"/);
  assert.match(html, /id="view-mode"/);
  assert.equal((html.match(/id="coffee-shop-theme-toggle"/g) || []).length, 1);
});

test("all dashboard sections have a heading and retain their existing feature controls", () => {
  for (const id of sectionIds) {
    const section = html.match(new RegExp('<section[^>]*id="' + id + '"[\\s\\S]*?<\\/section>'));
    assert.ok(section, "missing section " + id);
    assert.match(section[0], /class="[^"]*page-heading/, "missing page heading in " + id);
    assert.match(section[0], /<h2[^>]*>/, "missing page title in " + id);
  }
  for (const id of featureIds) {
    assert.ok(html.includes('id="' + id + '"'), "missing feature control " + id);
  }
});

test("configuration workspaces use consistent settings panels", () => {
  for (const id of ["moderation", "invites", "leveling", "currency", "emojis", "shop", "logs", "birthday", "settings", "account", "owner-billing"]) {
    const section = html.match(new RegExp('<section[^>]*id="' + id + '"[\\s\\S]*?<\\/section>'));
    assert.ok(section && section[0].includes("settings-panel"), "missing settings panel in " + id);
  }
  assert.match(sectionCss, /\.page-heading/);
  assert.match(sectionCss, /\.settings-layout/);
  assert.match(sectionCss, /\.settings-panel/);
  assert.match(sectionCss, /\.settings-group/);
  assert.match(sectionCss, /@media[^{}]*max-width:\s*768px/);
});

test("redesigned shell has responsive ownership for drawer and worktop", () => {
  assert.match(sectionCss, /\.dashboard-menu-toggle/);
  assert.match(sectionCss, /\.dashboard-nav-backdrop/);
  assert.match(sectionCss, /\.server-bar[^{]*\{/);
  assert.match(sectionCss, /@media[^{}]*max-width:\s*768px/);
  assert.match(sectionCss, /prefers-reduced-motion/);
  assert.match(sectionCss, /\.account \{ grid-column: 2; grid-row: 2;/);
  assert.match(sectionCss, /\.view-mode-wrap \{ grid-column: 2; grid-row: 1;/);
});

test("all original account, guest, draft, and Server View roots remain", () => {
  for (const id of ["customer-billing-portal", "customer-cancel-subscription", "customer-resume-subscription", "customer-plan-list", "customer-invoice-list", "owner-plan-list", "owner-customer-list", "guest-auth-bar", "guest-auth-modal", "guest-auth-form", "dashboard-draft-bar", "dashboard-draft-save", "server-view", "sv-channel-list", "sv-messages", "sv-member-panel", "sv-reply-bar", "sv-composer", "sv-settings-panel"]) {
    assert.ok(html.includes('id="' + id + '"'), "missing preserved root " + id);
  }
});

test("mobile navigation opens, closes, restores focus, and handles Escape", () => {
  const listeners = { toggle: [], backdrop: [], sidebar: [], document: [], window: [] };
  const classes = new Set();
  const makeTarget = (key) => ({
    attributes: {},
    addEventListener(type, handler) { listeners[key].push({ type, handler }); },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { this.focused = true; },
    title: ""
  });
  const toggle = makeTarget("toggle");
  const backdrop = makeTarget("backdrop");
  const sidebar = makeTarget("sidebar");
  const document = {
    readyState: "complete",
    body: { classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name, force) { if (force) classes.add(name); else classes.delete(name); }
    } },
    getElementById(id) { return id === "dashboard-menu-toggle" ? toggle : id === "dashboard-nav-backdrop" ? backdrop : null; },
    querySelector(selector) { return selector === "#app .sidebar" ? sidebar : selector === "#app .content" ? { querySelectorAll() { return []; } } : null; },
    querySelectorAll() { return []; },
    addEventListener(type, handler) { listeners.document.push({ type, handler }); }
  };
  const window = { addEventListener(type, handler) { listeners.window.push({ type, handler }); }, matchMedia() { return { matches: false }; } };
  vm.runInNewContext(shellScript, { window, document });
  assert.equal(toggle.attributes["aria-expanded"], "false");
  listeners.toggle[0].handler();
  assert.equal(classes.has("dashboard-nav-open"), true);
  assert.equal(toggle.attributes["aria-expanded"], "true");
  listeners.document.find(item => item.type === "keydown").handler({ key: "Escape" });
  assert.equal(classes.has("dashboard-nav-open"), false);
  assert.equal(toggle.attributes["aria-expanded"], "false");
  assert.equal(toggle.focused, true);
  listeners.toggle[0].handler();
  listeners.backdrop[0].handler();
  assert.equal(classes.has("dashboard-nav-open"), false);
});

test("mobile navigation initialization is idempotent", () => {
  const listeners = { toggle: [], backdrop: [], sidebar: [], document: [], window: [] };
  const target = key => ({ attributes: {}, addEventListener(type, handler) { listeners[key].push({ type, handler }); }, setAttribute(name, value) { this.attributes[name] = value; }, focus() {}, title: "" });
  const toggle = target("toggle"), backdrop = target("backdrop"), sidebar = target("sidebar");
  const document = {
    readyState: "complete",
    body: { classList: { add(){}, remove(){}, contains(){return false;}, toggle(){} } },
    getElementById(id) { return id === "dashboard-menu-toggle" ? toggle : id === "dashboard-nav-backdrop" ? backdrop : null; },
    querySelector() { return sidebar; },
    querySelectorAll() { return []; },
    addEventListener(type, handler) { listeners.document.push({ type, handler }); }
  };
  const window = { addEventListener(type, handler) { listeners.window.push({ type, handler }); }, matchMedia() { return { matches: false }; } };
  vm.runInNewContext(shellScript, { window, document });
  window.DashboardShell?.init?.();
  assert.equal(listeners.toggle.length, 1);
  assert.equal(listeners.backdrop.length, 1);
  assert.equal(listeners.document.filter(item => item.type === "keydown").length, 1);
});


test("task-specific configuration groups and split libraries are present", () => {
  for (const id of ["leveling", "currency"]) {
    const start = html.indexOf('<section id="' + id + '"');
    const end = html.indexOf("</section>", start);
    const section = html.slice(start, end);
    assert.ok((section.match(/class="settings-group"/g) || []).length >= 3, id + " needs task-specific groups");
  }
  for (const id of ["emojis", "shop"]) {
    const start = html.indexOf('<section id="' + id + '"');
    const end = html.indexOf("</section>", start);
    const section = html.slice(start, end);
    assert.ok((section.match(/class="card form-card wide settings-panel/g) || []).length >= 2, id + " needs separate editor and library/inventory panels");
  }
});

test("Server View has a redesigned workspace layout in both shared themes", () => {
  assert.ok(serverViewCss.includes("grid-template-columns: 252px minmax(0,1fr)"));
  assert.ok(serverViewCss.includes("#server-view.server-view[hidden] { display: none !important; }"));
  assert.ok(serverViewCss.includes(".sv-chat-head"));
  assert.ok(serverViewCss.includes(".sv-composer-wrap"));
  assert.ok(serverViewCss.includes("@media (max-width: 768px)"));
  assert.ok(serverViewCss.includes("prefers-reduced-motion"));
  assert.ok(serverViewCss.includes('body[data-coffee-theme="cafe"] #server-view'));
  assert.ok(serverViewCss.includes('body[data-coffee-theme="dark-roast"] #server-view'));
});

test("dashboard markup contains no duplicate IDs", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});


test("dynamically injected feature pages use the shared workspace and currency groups", () => {
  assert.ok(shellScript.includes('section.querySelector(".page-heading")'));
  assert.ok(shellScript.includes('layout.className = "settings-layout"'));
  assert.ok(shellScript.includes('card.classList.add("settings-panel")'));
  assert.ok(featureUiScript.includes('extras.className = "settings-group"'));
  assert.ok(featureUiScript.includes('id="cur-weekly-min"'));
  assert.ok(!featureUiScript.includes('id="cur-work-min" type="number" min="0" value="50"'));
});


test("navigation grouping runs only after every feature tab injector", () => {
  const order = [
    "/features-ui.js?v=10",
    "/features-ui-patch.js?v=13",
    "/features-custom-emojis.js",
    "/features-automod-staff.js",
    "/features-ai-chat.js",
    "/features-loa.js",
    "/features-activitycheck.js",
    "/refined-dashboard.js?v=5",
    "/dashboard-shell.js?v=1"
  ].map(asset => bootloader.indexOf(asset));
  assert.ok(order.every(index => index >= 0), "all tab injectors and shell assets must be loaded");
  assert.deepEqual(order, [...order].sort((a, b) => a - b), "feature tabs must be inserted before the navigation is grouped");
});


test("mobile drawer stylesheet loads after legacy responsive rules", () => {
  const sections = bootloader.indexOf('loadCss("/dashboard-sections.css?v=1")');
  const mobile = bootloader.indexOf('loadCss("/coffee-shop-mobile.css?v=1")');
  assert.ok(sections >= 0, "dashboard section stylesheet must load");
  assert.ok(mobile > sections, "mobile drawer overrides must load last");
  assert.match(mobileCss, /\.sidebar \{[\s\S]*?position: fixed !important/);
  assert.match(mobileCss, /\.dashboard-nav-open #app \.sidebar \{[\s\S]*?transform: translateX\(0\) !important/);
  assert.match(mobileCss, /\.navigation \{[\s\S]*?flex-direction: column !important/);
  assert.match(mobileCss, /\.dashboard-menu-toggle \{[\s\S]*?display: inline-flex !important/);
  assert.match(mobileCss, /\.header-text \{[\s\S]*?display: grid/);
  assert.match(mobileCss, /\.ds-nav-group-items\[hidden\] \{ display: none !important; \}/);
  assert.match(mobileCss, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(mobileCss, /@media \(max-width: 900px\)[\s\S]*?\.guest-auth-bar \{[\s\S]*?flex-direction: column/);
  assert.match(mobileCss, /\.guest-auth-actions > button \{[\s\S]*?min-width: 0 !important/);
  assert.match(mobileCss, /#guest-signup-open \{\s*grid-column: 1 \/ -1/);

});


test("dashboard uses the new café-counter HTML composition, not only theme CSS", () => {
  assert.match(html, /class="coffee-shop-shell"/);
  assert.match(html, /class="cafe-menu-heading"/);
  assert.match(html, /<nav class="navigation cafe-rail-section" id="dashboard-navigation"/);
  assert.ok(html.indexOf('<aside class="sidebar cafe-wood-rail cafe-menu-board">') < html.indexOf('<nav class="navigation cafe-rail-section"'));
  assert.match(html, /class="[^"]*coffee-counter/);
  assert.match(html, /class="[^"]*coffee-counter-greeting/);
  assert.match(html, /class="[^"]*server-ticket coffee-server-ticket/);
  assert.match(html, /class="content workspace-paper cafe-workspace-board"/);
  assert.match(controlCenterCss, /repeating-linear-gradient\(2deg/);
  assert.match(controlCenterCss, /\.cafe-wood-rail/);
  assert.match(controlCenterCss, /\.coffee-welcome-board/);
  assert.match(controlCenterCss, /\.workspace-paper/);
  assert.match(html, /class="cafe-server-card"/);
});


test("bootloader loads the dashboard document from the same deployment", () => {
  assert.match(bootloader, /var url = "\/dashboard\.html"/);
  assert.doesNotMatch(bootloader, /raw\.githubusercontent\.com\/elyaginnings-cell\/Bot-Website\/main\/dashboard\.html/);
});


test("custom emoji navigation injects into the settings group after menu grouping", () => {
  assert.match(customEmojiScript, /settings && settings\.parentElement !== nav/);
  assert.match(customEmojiScript, /destination\.insertBefore\(button/);
});


test("dashboard follows Paisley's café menu blueprint with menu, workspace, and server card", () => {
  assert.match(html, /class="[^"]*cafe-menu-board/);
  assert.match(html, /class="[^"]*cafe-workspace-board/);
  assert.match(html, /class="[^"]*cafe-server-card/);
  assert.match(html, /class="[^"]*coffee-shop-wordmark/);
  assert.match(html, /id="dashboard-navigation"/);
  assert.match(html, /id="selected-server-name"/);
  assert.match(html, /id="server-member-count"/);
  assert.match(html, /id="server-online-count"/);
  assert.match(html, /id="server-owner-status"/);
  assert.match(html, /id="storage-status"/);
  assert.match(controlCenterCss, /\.coffee-shop-shell/);
  assert.match(controlCenterCss, /\.cafe-menu-board/);
  assert.match(controlCenterCss, /\.cafe-workspace-board/);
  assert.match(controlCenterCss, /\.cafe-server-card/);
  assert.match(controlCenterCss, /#guest-auth-bar/);
  assert.match(bootloader, /coffee-shop-control-center\.css\?v=3/);
});



test("Paisley board composition uses three hand-drawn columns and the parchment frame", () => {
  assert.ok(html.includes('class="cafe-header-identity"'));
  assert.ok(html.includes('id="cafe-header-name"'));
  assert.ok(html.includes('id="cafe-header-server"'));
  assert.ok(menuRedesignCss.includes("grid-template-columns:minmax(340px,1.32fr) minmax(280px,1fr) minmax(220px,.72fr)"));
  assert.ok(menuRedesignCss.includes("border:12px solid var(--menu-edge)"));
  assert.ok(menuRedesignCss.includes('ds-nav-group[data-group="systems"]{grid-column:1;grid-row:5}'));
  assert.ok(menuRedesignCss.includes('ds-nav-group[data-group="workspace"]{grid-column:2;grid-row:2}'));
  assert.ok(menuRedesignCss.includes('ds-nav-group[data-group="server"]{grid-column:2;grid-row:3}'));
  assert.ok(menuRedesignCss.includes("grid-column:3;grid-row:2/span 5"));
  assert.ok(menuRedesignCss.includes("Comic Sans MS"));
});

test("menu board stylesheet loads after legacy styles in both entry paths", () => {
  assert.ok(html.includes('coffee-shop-menu-redesign.css?v=6'));
  assert.ok(html.includes('guest-auth.css?v=2'));
  assert.ok(bootloader.indexOf('loadCss("/coffee-shop-menu-redesign.css?v=6")') > bootloader.indexOf('loadCss("/coffee-shop-control-center.css?v=3")'));
  assert.ok(menuRedesignCss.includes('.guest-auth-modal[hidden]{display:none!important}'));
  assert.ok(menuRedesignCss.includes(".guest-auth-card"));
});

test("guest preview account bar floats independently of the server stats panel", () => {
  const mainStart = html.indexOf('<main class="main coffee-main">');
  const mainEnd = html.indexOf("</main>", mainStart);
  const bannerStart = html.indexOf('id="guest-auth-bar"');
  assert.ok(mainStart >= 0 && bannerStart > mainStart && bannerStart < mainEnd);
  assert.match(menuRedesignCss, /#guest-auth-bar\.guest-auth-bar[\s\S]*?position:fixed!important/);
});

test("header plaque follows the live account and selected server labels", () => {
  assert.ok(shellScript.includes("cafe-header-name"));
  assert.ok(shellScript.includes("cafe-header-server"));
  assert.ok(shellScript.includes("MutationObserver(syncBoardIdentity)"));
});

test("Home and Menu are separate destinations with a full-width mobile workspace", () => {
  assert.ok(html.includes('data-section-link="menu"'));
  assert.ok(menuPageScript.includes('section.id="menu"'));
  assert.ok(menuPageScript.includes('id="dashboard-see-menu"'));
  assert.ok(menuPageScript.includes('data-menu-target'));
  assert.ok(menuRedesignCss.includes('body[data-coffee-theme][data-dashboard-page="menu"]'));
  assert.ok(menuRedesignCss.includes("@media(max-width:900px)"));
  assert.ok(menuRedesignCss.includes("grid-template-columns:minmax(0,1fr)"));
});

test("Tab Manager includes every bot feature, including dashboard-less Chess", () => {
  for (const key of ["achievements","activitycheck","ai","analytics","applications","auditLog","automod","birthday","bump","chess","currency","customEmojis","fishing","giveaways","help","invites","leveling","loa","logging","memberPresence","moderation","profile","punishment","qotd","selfroles","shop","suggestions","tickets","verification"]) {
    assert.ok(featureManagerScript.includes('"'+key+'"'), "missing feature switch "+key);
  }
  assert.match(featureManagerScript, /Enable all/);
  assert.match(featureManagerScript, /Disable all/);
  assert.match(featureManagerScript, /saveConfig\(\{systems\}\)/);
  assert.match(menuRedesignCss, /\.feature-manager-row/);
});

test("Coffee Shop keeps the main workspace as a real container on desktop and mobile", () => {
  const desktopMainRule = menuRedesignCss.slice(menuRedesignCss.lastIndexOf("body[data-coffee-theme] #app>.main.coffee-main{"));
  assert.ok(desktopMainRule.startsWith("body[data-coffee-theme] #app>.main.coffee-main{"));
  assert.ok(desktopMainRule.includes("display:flex!important"));
  assert.ok(desktopMainRule.includes("flex-direction:column!important"));
  const mobileLayout = menuRedesignCss.slice(menuRedesignCss.lastIndexOf("@media(max-width:900px)"));
  assert.ok(mobileLayout.includes("body[data-coffee-theme] #app>.main.coffee-main{"));
  assert.ok(mobileLayout.includes("display:flex!important"));
  assert.ok(menuRedesignCss.includes("position:fixed!important;"));
  assert.ok(menuRedesignCss.includes("left:50%!important;"));
  assert.ok(menuRedesignCss.includes("transform:translateX(-50%)!important;"));
});


test("Home and Menu remove the legacy navigation board from the visible workspace", () => {
  assert.match(menuPageScript, /side\.setAttribute\(\"aria-hidden\",\"true\"\)/);
  assert.match(menuRedesignCss, /#app \.sidebar\[aria-hidden=\"true\"\]\s*\{\s*display:none!important;/);
  assert.match(menuRedesignCss, /#app\.coffee-shop-shell\s*\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(250px,320px\)!important/);
  assert.match(menuRedesignCss, /#app>\.main\.coffee-main\s*\{[^}]*grid-column:1!important/);
  assert.match(menuRedesignCss, /#app>\.cafe-server-card\s*\{[^}]*grid-column:2!important/);
});
