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

export async function mergeGuildConfig(guildId, patch) {
  const current = (await loadGuildConfig(guildId)) || {};
  const next = { ...current, ...patch };
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
    next.shop = { ...(current.shop || {}), ...patch.shop };
  }
  await saveGuildConfig(guildId, next);
  return next;
}
