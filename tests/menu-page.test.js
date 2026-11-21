import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const menu = readFileSync(new URL("../dashboard-menu-page.js", import.meta.url), "utf8");

test("menu includes configurable tabs even when disabled tabs are hidden from the sidebar", () => {
  assert.match(menu, /nav\.querySelectorAll\("\[data-tab\]"\)\.forEach\(button=>\{/);
  assert.doesNotMatch(menu, /if\(button\.hidden\)return/);
  assert.match(menu, /if\(id==="owner-billing"&&button\.hidden\)return/);
  assert.match(menu, /if\(!document\.getElementById\(id\)\)return/);
  assert.match(menu, /Currently disabled · open to configure/);
});

test("menu categorizes all current configurable feature families", () => {
  for (const id of ["automod", "punishment", "verification", "applications", "tickets", "loa", "activitycheck", "aichat", "staffai", "aistaff", "help", "logging"]) {
    assert.match(menu, new RegExp(id + ':"'));
  }
});

test("menu signature changes when a feature is enabled or disabled", () => {
  assert.match(menu, /b\.hidden\?"hidden":"visible"/);
});
