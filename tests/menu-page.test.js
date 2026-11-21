import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const menu = readFileSync(new URL("../dashboard-menu-page.js", import.meta.url), "utf8");
const shell = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("menu is generated from every configuration section, not just sidebar buttons", () => {
  assert.match(menu, /host\.querySelectorAll\("\.page-section"\)/);
  assert.match(menu, /sectionLabel\(section,button\)/);
  assert.doesNotMatch(menu, /nav\.querySelectorAll\("\[data-tab\]"\)\.forEach\(button=>\{/);
  assert.match(menu, /Other Configuration/);
});

test("menu retains disabled sidebar tabs and only hides restricted owner billing", () => {
  assert.match(menu, /button&&button\.hidden/);
  assert.match(menu, /Currently disabled · open to configure/);
  assert.match(menu, /id==="owner-billing"&&\(!button\|\|button\.hidden\)/);
});

test("menu refreshes when dynamically-created configuration sections appear", () => {
  assert.match(menu, /contentObserver\.observe\(host,\{childList:true,subtree:true\}\)/);
  assert.match(menu, /if\(activeId\(\)==="menu"\)buildMenu\(\)/);
});

test("dashboard loads the current menu script version", () => {
  assert.match(shell, /dashboard-menu-page\.js\?v=4/);
});
