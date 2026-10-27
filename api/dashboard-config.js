import { requireAnySession } from "../lib/requireAuth.js";
import { queryExistingSchema } from "../lib/db.js";
import { mergePreservingUnknown, botConfigPayload } from "../lib/dashboardConfigMerge.js";

const RAILWAY_API = (process.env.BOT_API_URL || "https://discord-bot-production-1488.up.railway.app").replace(/\/$/, "");
function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

async function loadExistingConfig(guildId) {
  const result = await queryExistingSchema(
    "SELECT value FROM bot_state WHERE key = $1",
    [`guild_config:${guildId}`]
  );
  const value = result.rows[0]?.value;
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

export default async function handler(req, res) {
  try {
    try {
      requireAnySession(req);
    } catch (error) {
      return res.status(error.status || 401).json({ error: error.message || "Not authenticated" });
    }

    const guildId = String(req.query?.guildId || "").trim();
    if (!guildId) return res.status(400).json({ error: "Missing guildId" });

    if (req.method === "GET") {
      // Read-only by design: no bot fallback, no upsert, no schema initialization.
      const config = await loadExistingConfig(guildId);
      return res.status(200).json({
        config,
        source: config ? "postgres-read-only" : "empty",
        found: Boolean(config)
      });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const patch = readBody(req);
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      return res.status(400).json({ error: "Configuration patch must be an object." });
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "No configuration changes were provided." });
    }

    const current = await loadExistingConfig(guildId);
    if (!current) {
      return res.status(409).json({
        error: "No saved configuration exists for this server. Refusing to create a replacement from empty defaults.",
        code: "CONFIG_NOT_FOUND"
      });
    }

    const merged = mergePreservingUnknown(current, patch);
    await queryExistingSchema(
      "UPDATE bot_state SET value = $2::jsonb, updated_at = NOW() WHERE key = $1",
      [`guild_config:${guildId}`, JSON.stringify(merged)]
    );

    let savedToBot = false;
    let botWarning = null;
    const secret = process.env.DASHBOARD_API_SECRET;
    if (!secret) {
      botWarning = "Saved to existing website storage, but DASHBOARD_API_SECRET is not configured; the bot was not updated.";
    } else {
      try {
        const response = await fetch(`${RAILWAY_API}/api/guild/${encodeURIComponent(guildId)}/config`, {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
          body: JSON.stringify(botConfigPayload(merged)),
          cache: "no-store"
        });
        const data = await response.json().catch(() => ({}));
        savedToBot = response.ok;
        if (!response.ok) botWarning = data.error || `Bot update failed (HTTP ${response.status}).`;
      } catch (error) {
        botWarning = error.message || "Could not reach the bot API.";
      }
    }

    return res.status(200).json({
      ok: true,
      config: merged,
      savedToExistingStorage: true,
      savedToBot,
      warning: botWarning
    });
  } catch (error) {
    console.error("Dashboard config API error:", error);
    return res.status(500).json({ error: error.message || "Dashboard config request failed." });
  }
}
