import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const menu = readFileSync(new URL("../dashboard-menu-page.js", import.meta.url), "utf8");
const shell = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("menu injects a dedicated page and a header navigation control", () => {
  assert.match(menu, /function ensureButton\(\)/);
  assert.match(menu, /function ensureSection\(\)/);
  assert.match(menu, /id="menu"/);
  assert.match(menu, /id="dashboard-see-menu"/);
});

test("menu builds its categories from the existing dashboard navigation", () => {
  assert.match(menu, /nav\.querySelectorAll\("\[data-tab\]"\)/);
  assert.match(menu, /Moderation & Safety/);
  assert.match(menu, /Staff & Support/);
  assert.match(menu, /AI & Automation/);
  assert.match(menu, /System Controls/);
});

test("menu navigation preserves the existing showSection handler", () => {
  assert.match(menu, /original\.apply\(this,arguments\)/);
  assert.match(menu, /data-menu-target/);
  assert.match(menu, /data-menu-home/);
});

test("dashboard loads the restored menu script with a fresh cache version", () => {
  assert.match(shell, /dashboard-menu-page\.js\?v=5/);
});
