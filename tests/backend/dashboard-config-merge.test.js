import test from "node:test";
import assert from "node:assert/strict";
import { botConfigPayload, mergePreservingUnknown } from "../../lib/dashboardConfigMerge.js";

test("partial nested updates preserve unrelated and unknown saved keys", () => {
  const existing = {
    warnChannelId: "channel-old",
    unknownFutureFeature: { enabled: true, marker: "keep-me" },
    automod: { enabled: false, filters: { spam: true, links: false } },
    selfRoles: { categories: [{ id: "cat-1", children: [{ id: "group-1", roles: [{ roleId: "role-9" }] }] }] }
  };
  const merged = mergePreservingUnknown(existing, { automod: { enabled: true } });
  assert.equal(merged.warnChannelId, "channel-old");
  assert.deepEqual(merged.unknownFutureFeature, existing.unknownFutureFeature);
  assert.equal(merged.automod.enabled, true);
  assert.deepEqual(merged.automod.filters, existing.automod.filters);
  assert.deepEqual(merged.selfRoles, existing.selfRoles);
});

test("arrays remain untouched unless the patch explicitly changes them", () => {
  const existing = { selfRoles: { categories: [{ id: "cat-1", roles: ["role-1"] }] } };
  const untouched = mergePreservingUnknown(existing, { selfRoles: { enabled: true } });
  assert.deepEqual(untouched.selfRoles.categories, existing.selfRoles.categories);
  const changed = mergePreservingUnknown(existing, { selfRoles: { categories: [{ id: "cat-2", roles: ["role-2"] }] } });
  assert.deepEqual(changed.selfRoles.categories, [{ id: "cat-2", roles: ["role-2"] }]);
});

test("bot payload only forwards known bot configuration keys", () => {
  const payload = botConfigPayload({
    levelingEnabled: true,
    selfRoles: { categories: [] },
    unknownFutureFeature: { enabled: true },
    internalOnly: "do-not-forward"
  });
  assert.equal(payload.levelingEnabled, true);
  assert.deepEqual(payload.selfRoles, { categories: [] });
  assert.equal("unknownFutureFeature" in payload, false);
  assert.equal("internalOnly" in payload, false);
});

test("empty patch preserves the complete existing object", () => {
  const existing = { shop: { enabled: true, items: [{ id: "a" }] }, ai: { staff: { allowedActions: { warn: true } } } };
  assert.deepEqual(mergePreservingUnknown(existing, {}), existing);
});
