import { requireAnySession } from "../lib/requireAuth.js";
import { loadGuildConfig, mergeGuildConfig, saveGuildConfig } from "../lib/guildConfig.js";

const RAILWAY_API =
  process.env.BOT_API_URL ||
  "https://discord-bot-production-1488.up.railway.app";

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
      try {
        const response = await fetch(`${RAILWAY_API}/api/guild/${guildId}/config`, {
          headers: { Authorization: `Bearer ${dashboardSecret}` },
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data?.config) {
          try {
            await saveGuildConfig(guildId, data.config);
          } catch (mirrorErr) {
            console.error("Config mirror save failed:", mirrorErr.message);
          }
          return res.status(200).json(data);
        }
      } catch (botErr) {
        console.error("Bot config GET failed:", botErr.message);
      }

      const stored = await loadGuildConfig(guildId);
      if (stored) {
        return res.status(200).json({ config: stored, source: "postgres" });
      }
      return res.status(404).json({ error: "Config not found" });
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};

      let mirrored = null;
      try {
        mirrored = await mergeGuildConfig(guildId, body);
      } catch (pgErr) {
        console.error("Website Postgres config save failed:", pgErr.message);
        return res.status(500).json({
          error:
            "Failed to save to Postgres. Check DATABASE_URL on Vercel (public Railway URL).",
          detail: pgErr.message,
        });
      }

      let botData = null;
      let botOk = false;
      try {
        const response = await fetch(`${RAILWAY_API}/api/guild/${guildId}/config`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${dashboardSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        botData = await response.json().catch(() => ({}));
        botOk = response.ok;
        if (response.ok && botData?.config) {
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
        config: botOk && botData?.config ? botData.config : mirrored,
        savedToPostgres: true,
        savedToBot: botOk,
        logResult: botData?.logResult || null,
        changes: botData?.changes || null,
        warning: botOk
          ? null
          : "Saved to website Postgres. Bot did not accept the update (it may be offline). Settings will still load from Postgres.",
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
