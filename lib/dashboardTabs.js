export const DASHBOARD_TAB_KEYS = Object.freeze([
  "moderation", "invites", "leveling", "currency", "emojis",
  "shop", "logs", "birthday", "account", "owner-billing"
]);

export function mergeDashboardTabs(current, patch) {
  const next = current && typeof current === "object" && !Array.isArray(current) ? { ...current } : {};
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return next;
  for (const key of DASHBOARD_TAB_KEYS) {
    if (typeof patch[key] === "boolean") next[key] = patch[key];
  }
  return next;
}
