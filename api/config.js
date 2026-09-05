import { requireAnySession } from "../lib/requireAuth.js";
import { loadGuildConfig, mergeGuildConfig, saveGuildConfig } from "../lib/guildConfig.js";

const RAILWAY_API =
  process.env.BOT_API_URL ||
  "https://discord-bot-production-1488.up.railway.app";

async function fetchBotConfig(guildId, dashboardSecret) {
  const response = await fetch(`${RAILWAY_API}/api/guild/${guildId}/config`, {
    headers: { Authorization: `Bearer ${dashboardSecret}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: response.status, error: data.error || "Bot config failed", data };
  }
  return { ok: true, config: data.config || null, data };
}

async function pushBotConfig(guildId, dashboardSecret, body) {
  const response = await fetch(`${RAILWAY_API}/api/guild/${guildId}/config`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dashboardSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export default async function handler(req, res) {
  try {
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || "Not authenticated" });
    }

    const dashboardSecret = process.env.DASHBOARD_API_SECRET;
    if (!dashboardSecret) {
      return res.status(500).json({ error: "Missing DASHBOARD_API_SECRET" });
    }

    const guildId = req.query?.guildId;
    if (!guildId) {
      return res.status(400).json({ error: "Missing guildId" });
    }

    if (req.method === "GET") {
      // Website Postgres is the source of truth for the dashboard.
      // Never overwrite a stored save with a stale bot response.
      let stored = null;
      let pgError = null;
      try {
        stored = await loadGuildConfig(guildId);
      } catch (err) {
        pgError = err.message;
        console.error("Postgres load failed:", err.message);
      }

      let bot = { ok: false };
      try {
        bot = await fetchBotConfig(guildId, dashboardSecret);
      } catch (err) {
        bot = { ok: false, error: err.message };
      }

      if (stored) {
        return res.status(200).json({
          config: stored,
          source: "postgres",
          botOnline: !!bot.ok,
          pgError: null,
        });
      }

      if (bot.ok && bot.config) {
        // Seed website Postgres from bot on first load only
        try {
          await saveGuildConfig(guildId, bot.config);
        } catch (mirrorErr) {
          console.error("Config seed save failed:", mirrorErr.message);
          pgError = mirrorErr.message;
        }
        return res.status(200).json({
          config: bot.config,
          source: "bot",
          botOnline: true,
          pgError,
        });
      }

      return res.status(404).json({
        error: "Config not found",
        pgError,
        botError: bot.error || null,
      });
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};

      // Ensure we have a base config so partial saves don't wipe other fields
      let base = null;
      try {
        base = await loadGuildConfig(guildId);
      } catch (err) {
        console.error("Postgres base load failed:", err.message);
      }
      if (!base) {
        try {
          const bot = await fetchBotConfig(guildId, dashboardSecret);
          if (bot.ok && bot.config) base = bot.config;
        } catch (_) {}
      }
      if (base) {
        try {
          await saveGuildConfig(guildId, base);
        } catch (_) {}
      }

      let mirrored = null;
      try {
        mirrored = await mergeGuildConfig(guildId, body);
      } catch (pgErr) {
        console.error("Website Postgres config save failed:", pgErr.message);
        return res.status(500).json({
          error:
            "Failed to save to Postgres. On Vercel set DATABASE_URL to the Railway PUBLIC URL (host like xxx.proxy.rlwy.net).",
          detail: pgErr.message,
        });
      }

      // Push the same patch to the live bot so runtime updates immediately
      let botOk = false;
      let botData = {};
      try {
        const pushed = await pushBotConfig(guildId, dashboardSecret, body);
        botOk = pushed.ok;
        botData = pushed.data || {};
        if (pushed.ok && botData.config) {
          // Prefer the bot's normalized full config shape when available
          try {
            await saveGuildConfig(guildId, botData.config);
            mirrored = botData.config;
          } catch (_) {}
        }
      } catch (botErr) {
        console.error("Bot config POST failed:", botErr.message);
      }

      return res.status(200).json({
        ok: true,
        config: mirrored,
        savedToPostgres: true,
        savedToBot: botOk,
        logResult: botData.logResult || null,
        changes: botData.changes || null,
        warning: botOk
          ? null
          : "Saved on the website (Postgres). The bot did not accept the update — check Railway is online and DASHBOARD_API_SECRET matches.",
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Config API error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Internal error",
    });
  }
}
