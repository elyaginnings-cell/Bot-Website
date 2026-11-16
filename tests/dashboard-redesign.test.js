import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../dashboard.html", import.meta.url), "utf8");
const bootloader = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const shellCss = readFileSync(new URL("../coffee-shop-dashboard.css", import.meta.url), "utf8");
const sectionCss = (() => { try { return readFileSync(new URL("../dashboard-sections.css", import.meta.url), "utf8"); } catch { return ""; } })();
const navigationScript = readFileSync(new URL("../refined-dashboard.js", import.meta.url), "utf8");
const shellScript = (() => { try { return readFileSync(new URL("../dashboard-shell.js", import.meta.url), "utf8"); } catch { return ""; } })();

const sectionIds = ["overview", "moderation", "invites", "leveling", "currency", "emojis", "shop", "logs", "birthday", "settings", "account", "owner-billing"];
const featureIds = [
  "warn-channel", "save-moderation", "moderation-status", "invite-channel", "save-invites", "invites-status",
  "lvl-enabled", "lvl-xp-min", "lvl-xp-max", "lvl-xp-cd", "lvl-beans-base", "lvl-beans-linear", "lvl-beans-quad", "lvl-preview", "save-leveling", "level-roles-list",
  "cur-enabled", "cur-name", "cur-emoji", "cur-daily-min", "cur-daily-max", "cur-work-min", "cur-work-max", "cur-chat-enabled", "cur-flip-enabled", "save-currency",
  "emoji-name", "emoji-category", "emoji-source", "emoji-file", "emoji-import-preview", "save-custom-emoji", "custom-emoji-list",
  "shop-enabled", "shop-type", "shop-name", "shop-price", "shop-role", "shop-items-list", "add-shop-item",
  "dashboard-log-channel", "save-logs", "test-log", "bday-channel", "bday-role", "bday-bonus", "save-birthday",
  "dashboard-tab-moderation", "site-name", "save-branding", "bot-status", "save-presence"
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
    querySelector(selector) { return selector === "#app .sidebar" ? sidebar : null; },
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
    addEventListener(type, handler) { listeners.document.push({ type, handler }); }
  };
  const window = { addEventListener(type, handler) { listeners.window.push({ type, handler }); }, matchMedia() { return { matches: false }; } };
  vm.runInNewContext(shellScript, { window, document });
  window.DashboardShell?.init?.();
  assert.equal(listeners.toggle.length, 1);
  assert.equal(listeners.backdrop.length, 1);
  assert.equal(listeners.document.filter(item => item.type === "keydown").length, 1);
});
