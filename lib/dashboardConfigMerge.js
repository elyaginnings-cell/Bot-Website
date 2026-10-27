export const DASHBOARD_CONFIG_KEYS = [
  "warnChannelId", "inviteLeaderboardChannelId", "dashboardLogChannelId", "levelUpChannelId",
  "levelingEnabled", "currencyEnabled", "shopEnabled", "leveling", "currency", "shop", "birthday",
  "selfRoles", "levelRoles", "bump", "verification", "suggestions", "tickets", "qotd", "analytics",
  "ai", "automod", "applications", "loa", "activityCheck", "systems", "auditLog", "logging"
];

/**
 * Merge only the explicitly supplied patch into an existing configuration.
 * Unknown keys are retained; arrays are replaced only when the patch includes
 * that exact array field. Callers must never invoke this with an empty default
 * as the current configuration.
 */
export function mergePreservingUnknown(current, patch) {
  const existing = current && typeof current === "object" && !Array.isArray(current) ? current : {};
  const changes = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
  const next = { ...existing };
  for (const [key, value] of Object.entries(changes)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const oldValue = existing[key] && typeof existing[key] === "object" && !Array.isArray(existing[key])
        ? existing[key]
        : {};
      next[key] = mergePreservingUnknown(oldValue, value);
    } else {
      next[key] = value;
    }
  }
  return next;
}

export function botConfigPayload(config) {
  const payload = {};
  for (const key of DASHBOARD_CONFIG_KEYS) {
    if (config[key] !== undefined) payload[key] = config[key];
  }
  return payload;
}
