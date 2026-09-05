import { query } from "./db.js";

function keyFor(guildId) {
  return `guild_config:${guildId}`;
}

export async function loadGuildConfig(guildId) {
  const result = await query(
    `SELECT value FROM bot_state WHERE key = $1`,
    [keyFor(guildId)]
  );
  if (!result.rows[0]) return null;
  const value = result.rows[0].value;
  return value && typeof value === "object" ? value : null;
}

export async function saveGuildConfig(guildId, config) {
  await query(
    `INSERT INTO bot_state (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [keyFor(guildId), JSON.stringify(config || {})]
  );
  return config;
}

/**
 * Apply dashboard patches the same way the bot does, so website Postgres
 * stores the real config shape (not raw action keys like setLevelRole).
 */
export async function mergeGuildConfig(guildId, patch) {
  const current = (await loadGuildConfig(guildId)) || {};
  const next = { ...current };

  // Simple top-level fields
  for (const key of [
    "warnChannelId",
    "inviteLeaderboardChannelId",
    "dashboardLogChannelId",
    "levelUpChannelId",
    "levelingEnabled",
    "currencyEnabled",
    "shopEnabled",
  ]) {
    if (patch[key] !== undefined) next[key] = patch[key];
  }

  if (patch.leveling && typeof patch.leveling === "object") {
    next.leveling = { ...(current.leveling || {}), ...patch.leveling };
  }
  if (patch.currency && typeof patch.currency === "object") {
    next.currency = { ...(current.currency || {}), ...patch.currency };
  }
  if (patch.birthday && typeof patch.birthday === "object") {
    next.birthday = { ...(current.birthday || {}), ...patch.birthday };
  }
  if (patch.shop && typeof patch.shop === "object") {
    const curShop = current.shop || {};
    next.shop = {
      ...curShop,
      ...patch.shop,
      items: Array.isArray(patch.shop.items)
        ? patch.shop.items
        : Array.isArray(curShop.items)
          ? curShop.items
          : [],
    };
  }

  // Action: set / remove level role
  if (patch.setLevelRole && typeof patch.setLevelRole === "object") {
    const { level, roleId } = patch.setLevelRole;
    if (level && roleId) {
      next.levelRoles = { ...(current.levelRoles || {}) };
      next.levelRoles[String(level)] = roleId;
    }
  }
  if (patch.removeLevelRole !== undefined && patch.removeLevelRole !== null) {
    next.levelRoles = { ...(current.levelRoles || {}) };
    delete next.levelRoles[String(patch.removeLevelRole)];
  }

  // Action: shop items
  if (patch.addShopItem && typeof patch.addShopItem === "object") {
    const shop = { ...(next.shop || current.shop || {}) };
    const items = Array.isArray(shop.items) ? [...shop.items] : [];
    items.push(patch.addShopItem);
    shop.items = items;
    if (patch.shopEnabled !== undefined) shop.enabled = !!patch.shopEnabled;
    next.shop = shop;
  }
  if (patch.removeShopItem !== undefined) {
    const shop = { ...(next.shop || current.shop || {}) };
    const items = Array.isArray(shop.items) ? [...shop.items] : [];
    const idx = Number(patch.removeShopItem);
    if (idx >= 0 && idx < items.length) items.splice(idx, 1);
    shop.items = items;
    next.shop = shop;
  }
  if (patch.shopEnabled !== undefined) {
    next.shop = { ...(next.shop || current.shop || {}), enabled: !!patch.shopEnabled };
  }

  // Keep nested enabled flags consistent
  if (patch.levelingEnabled !== undefined) {
    next.leveling = { ...(next.leveling || current.leveling || {}), enabled: !!patch.levelingEnabled };
  }
  if (patch.currencyEnabled !== undefined) {
    next.currency = { ...(next.currency || current.currency || {}), enabled: !!patch.currencyEnabled };
  }

  // Strip action-only keys so they never pollute stored config
  delete next.setLevelRole;
  delete next.removeLevelRole;
  delete next.addShopItem;
  delete next.removeShopItem;
  delete next.testLog;

  await saveGuildConfig(guildId, next);
  return next;
}
