import { query } from "./db.js";
import crypto from "crypto";

function keyFor(guildId) {
  return `guild_config:${guildId}`;
}

function newShopItemId() {
  return crypto.randomBytes(4).toString("hex");
}

function normalizeShopItem(item) {
  if (!item || typeof item !== "object") return null;
  const out = { ...item };
  if (!out.id) out.id = newShopItemId();
  if (out.name != null) out.name = String(out.name).slice(0, 80);
  if (out.price != null) out.price = Math.max(0, Number(out.price) || 0);
  return out;
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

  // Full shop object replace — only if items array is provided AND non-empty
  // or explicitly empty (admin cleared). Never clobber with undefined items.
  if (patch.shop && typeof patch.shop === "object") {
    const curShop = current.shop || {};
    const nextShop = { ...curShop, ...patch.shop };
    if (Array.isArray(patch.shop.items)) {
      nextShop.items = patch.shop.items
        .map(normalizeShopItem)
        .filter(Boolean);
    } else if (Array.isArray(curShop.items)) {
      nextShop.items = curShop.items;
    } else {
      nextShop.items = [];
    }
    next.shop = nextShop;
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

  // Action: add shop item (append — never replace whole list)
  if (patch.addShopItem && typeof patch.addShopItem === "object") {
    const shop = { ...(next.shop || current.shop || {}) };
    const items = Array.isArray(shop.items) ? [...shop.items] : [];
    const normalized = normalizeShopItem(patch.addShopItem);
    if (normalized) items.push(normalized);
    shop.items = items;
    if (patch.shopEnabled !== undefined) shop.enabled = !!patch.shopEnabled;
    next.shop = shop;
  }

  // Action: remove by index or by id
  if (patch.removeShopItem !== undefined && patch.removeShopItem !== null) {
    const shop = { ...(next.shop || current.shop || {}) };
    let items = Array.isArray(shop.items) ? [...shop.items] : [];
    const key = patch.removeShopItem;
    if (typeof key === "number" || (/^\d+$/.test(String(key)) && Number(key) < items.length)) {
      const idx = Number(key);
      if (idx >= 0 && idx < items.length) items.splice(idx, 1);
    } else {
      items = items.filter((it) => String(it.id) !== String(key));
    }
    shop.items = items;
    next.shop = shop;
  }

  if (patch.shopEnabled !== undefined) {
    next.shop = { ...(next.shop || current.shop || {}), enabled: !!patch.shopEnabled };
    if (!Array.isArray(next.shop.items)) {
      next.shop.items = Array.isArray((current.shop || {}).items)
        ? current.shop.items
        : [];
    }
  }

  // Keep nested enabled flags consistent
  if (patch.levelingEnabled !== undefined) {
    next.leveling = {
      ...(next.leveling || current.leveling || {}),
      enabled: !!patch.levelingEnabled,
    };
  }
  if (patch.currencyEnabled !== undefined) {
    next.currency = {
      ...(next.currency || current.currency || {}),
      enabled: !!patch.currencyEnabled,
    };
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

/**
 * Prefer website config when merging a bot response back.
 * Never let a bot payload with fewer shop items wipe the website list.
 */
export function preferWebsiteShop(websiteConfig, botConfig) {
  if (!websiteConfig) return botConfig || null;
  if (!botConfig) return websiteConfig;

  const merged = { ...websiteConfig, ...botConfig };

  const webItems =
    (websiteConfig.shop && Array.isArray(websiteConfig.shop.items) && websiteConfig.shop.items) ||
    [];
  const botItems =
    (botConfig.shop && Array.isArray(botConfig.shop.items) && botConfig.shop.items) || [];

  // Keep the longer / website list if bot returned a shorter one
  const items = botItems.length >= webItems.length ? botItems : webItems;

  merged.shop = {
    ...(websiteConfig.shop || {}),
    ...(botConfig.shop || {}),
    items: items.map(normalizeShopItem).filter(Boolean),
  };

  return merged;
}
