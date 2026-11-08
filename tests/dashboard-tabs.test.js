import test from "node:test";
import assert from "node:assert/strict";
import { mergeDashboardTabs } from "../lib/dashboardTabs.js";

test("tab preferences merge without overwriting unrelated tabs", () => {
  assert.deepEqual(
    mergeDashboardTabs({ moderation: false, emojis: true }, { account: false }),
    { moderation: false, emojis: true, account: false }
  );
});

test("tab preferences accept only known boolean values", () => {
  assert.deepEqual(
    mergeDashboardTabs({ moderation: false }, { moderation: "false", emojis: true, unknown: false }),
    { moderation: false }
  );
});
