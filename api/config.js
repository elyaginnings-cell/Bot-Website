import { requireAnySession } from "../lib/requireAuth.js";
import {
  loadGuildConfig,
  mergeGuildConfig,
  saveGuildConfig,
  preferWebsiteShop,
} from "../lib/guildConfig.js";

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
        if (bot.ok && bot.config) {
          const merged = preferWebsiteShop(stored, bot.config);
          if (JSON.stringify(merged.shop) !== JSON.stringify(stored.shop)) {
            try {
              await saveGuildConfig(guildId, merged);
              stored = merged;
            } catch (_) {}
          }
        }
        return res.status(200).json({
          config: stored,
          source: "postgres",
          botOnline: !!bot.ok,
          pgError: null,
        });
      }

      if (bot.ok && bot.config) {
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

      let mirrored = null;
      try {
        mirrored = await mergeGuildConfig(guildId, body);
        // Persist systems that older mergeGuildConfig may not yet map (analytics, etc.)
        const extraKeys = ["analytics", "qotd", "suggestions", "tickets", "verification", "bump"];
        let needsResave = false;
        for (const k of extraKeys) {
          if (body[k] && typeof body[k] === "object") {
            mirrored[k] = { ...(mirrored[k] || {}), ...body[k] };
            needsResave = true;
          }
        }
        if (needsResave) {
          await saveGuildConfig(guildId, mirrored);
        }
      } catch (pgErr) {
        console.error("Website Postgres config save failed:", pgErr.message);
        return res.status(500).json({
          error:
            "Failed to save to Postgres. On Vercel set DATABASE_URL to the Railway PUBLIC URL (host like xxx.proxy.rlwy.net).",
          detail: pgErr.message,
        });
      }

      const pushBody = {
        ...body,
        shop: mirrored?.shop,
        shopEnabled:
          body.shopEnabled !== undefined
            ? body.shopEnabled
            : mirrored?.shop?.enabled,
      };

      let botOk = false;
      let botData = {};
      try {
        const pushed = await pushBotConfig(guildId, dashboardSecret, pushBody);
        botOk = pushed.ok;
        botData = pushed.data || {};

        if (pushed.ok && botData.config) {
          const safe = preferWebsiteShop(mirrored, botData.config);
          try {
            await saveGuildConfig(guildId, safe);
            mirrored = safe;
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
