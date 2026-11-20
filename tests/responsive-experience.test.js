import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [css, dashboard, boot] = await Promise.all([
  readFile(new URL("../responsive-experience.css", import.meta.url), "utf8"),
  readFile(new URL("../dashboard.html", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8")
]);

test("responsive experience is loaded after the legacy dashboard styles", () => {
  assert.match(dashboard, /responsive-experience\.css\?v=3/);
  assert.ok(dashboard.indexOf("responsive-experience.css") > dashboard.indexOf("coffee-shop-menu-redesign.css"));
  assert.match(boot, /loadCss\("\/responsive-experience\.css\?v=3"\)/);
});

test("mobile layout has dedicated tablet and phone breakpoints", () => {
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /@media\s*\(max-width:\s*560px\)/);
  assert.match(css, /@media\s*\(max-width:\s*360px\)/);
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset-bottom/);
});

test("mobile layout includes navigation, dashboard, server view and authentication", () => {
  for (const selector of [
    ".dashboard-nav-open #app .sidebar",
    "#app .settings-layout",
    "#app .dashboard-draft-bar",
    "#server-view .sv-composer",
    ".guest-auth-card",
    "body.guest-preview .guest-auth-bar"
  ]) assert.ok(css.includes(selector), "missing responsive selector: " + selector);
});

test("mobile controls remain touch-friendly and avoid horizontal page overflow", () => {
  assert.match(css, /--mobile-touch:\s*46px/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /font-size:\s*16px\s*!important/);
});
