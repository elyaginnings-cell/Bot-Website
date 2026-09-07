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

export async function mergeGuildConfig(guildId, patch) {
  const current = (await loadGuildConfig(guildId)) || {};
  const next = { ...current };

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

  if (patch.bump && typeof patch.bump === "object") {
    next.bump = { ...(current.bump || {}), ...patch.bump };
  }
  if (patch.verification && typeof patch.verification === "object") {
    next.verification = { ...(current.verification || {}), ...patch.verification };
  }
  if (patch.suggestions && typeof patch.suggestions === "object") {
    next.suggestions = { ...(current.suggestions || {}), ...patch.suggestions };
  }
  if (patch.tickets && typeof patch.tickets === "object") {
    next.tickets = { ...(current.tickets || {}), ...patch.tickets };
  }
  if (patch.qotd && typeof patch.qotd === "object") {
    next.qotd = { ...(current.qotd || {}), ...patch.qotd };
  }
  if (patch.selfRoles && typeof patch.selfRoles === "object") {
    const cur = current.selfRoles || {};
    const p = patch.selfRoles;
    let categories = Array.isArray(cur.categories) ? cur.categories : [];
    if (Array.isArray(p.categories)) {
      categories = p.categories
        .filter((c) => c && c.name)
        .slice(0, 15)
        .map((c) => ({
          id: String(c.id || crypto.randomBytes(4).toString("hex")),
          name: String(c.name || "Category").slice(0, 100),
          emoji: c.emoji ? String(c.emoji).slice(0, 32) : "✨",
          description: String(c.description || "").slice(0, 500),
          tip: String(c.tip || "").slice(0, 300),
          footer: String(c.footer || "").slice(0, 200),
          placeholder: String(c.placeholder || "").slice(0, 150),
          mode: c.mode === "single" ? "single" : "multi",
          messageId: c.messageId || null,
          roles: Array.isArray(c.roles)
            ? c.roles
                .filter((r) => r && r.roleId)
                .slice(0, 25)
                .map((r) => ({
                  roleId: String(r.roleId),
                  label: String(r.label || "Role").slice(0, 100),
                  emoji: r.emoji || null,
                  description: r.description ? String(r.description).slice(0, 100) : null,
                }))
            : [],
        }));
    } else if (Array.isArray(p.roles) && p.roles.length && !categories.length) {
      categories = [
        {
          id: crypto.randomBytes(4).toString("hex"),
          name: "Roles",
          emoji: "✨",
          description: "",
          tip: "",
          footer: "Multiple selections allowed",
          mode: "multi",
          messageId: null,
          roles: p.roles
            .filter((r) => r && r.roleId)
            .slice(0, 25)
            .map((r) => ({
              roleId: String(r.roleId),
              label: String(r.label || "Role").slice(0, 100),
              emoji: r.emoji || null,
              description: r.description ? String(r.description).slice(0, 100) : null,
            })),
        },
      ];
    }
    next.selfRoles = {
      ...cur,
      ...p,
      categories,
    };
    delete next.selfRoles.roles;
  }

  if (patch.shop && typeof patch.shop === "object") {
    const curShop = current.shop || {};
    const nextShop = { ...curShop, ...patch.shop };
    if (Array.isArray(patch.shop.items)) {
      nextShop.items = patch.shop.items.map(normalizeShopItem).filter(Boolean);
    } else if (Array.isArray(curShop.items)) {
      nextShop.items = curShop.items;
    } else {
      nextShop.items = [];
    }
    next.shop = nextShop;
  }

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

  if (patch.addShopItem && typeof patch.addShopItem === "object") {
    const shop = { ...(next.shop || current.shop || {}) };
    const items = Array.isArray(shop.items) ? [...shop.items] : [];
    const normalized = normalizeShopItem(patch.addShopItem);
    if (normalized) items.push(normalized);
    shop.items = items;
    if (patch.shopEnabled !== undefined) shop.enabled = !!patch.shopEnabled;
    next.shop = shop;
  }

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

  delete next.setLevelRole;
  delete next.removeLevelRole;
  delete next.addShopItem;
  delete next.removeShopItem;
  delete next.testLog;

  await saveGuildConfig(guildId, next);
  return next;
}

export function preferWebsiteShop(websiteConfig, botConfig) {
  if (!websiteConfig) return botConfig || null;
  if (!botConfig) return websiteConfig;

  const merged = { ...websiteConfig, ...botConfig };

  const webItems =
    (websiteConfig.shop && Array.isArray(websiteConfig.shop.items) && websiteConfig.shop.items) ||
    [];
  const botItems =
    (botConfig.shop && Array.isArray(botConfig.shop.items) && botConfig.shop.items) || [];

  const items = botItems.length >= webItems.length ? botItems : webItems;

  merged.shop = {
    ...(websiteConfig.shop || {}),
    ...(botConfig.shop || {}),
    items: items.map(normalizeShopItem).filter(Boolean),
  };

  for (const key of ["bump", "verification", "suggestions", "tickets", "qotd", "currency", "birthday", "selfRoles"]) {
    if (websiteConfig[key] && typeof websiteConfig[key] === "object") {
      merged[key] = { ...(botConfig[key] || {}), ...websiteConfig[key] };
    }
  }

  return merged;
}
