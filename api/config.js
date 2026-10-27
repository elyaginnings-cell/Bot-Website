import { requireAnySession } from "../lib/requireAuth.js";
import {
  loadGuildConfig,
  mergeGuildConfig,
  saveGuildConfig,
  preferWebsiteShop,
} from "../lib/guildConfig.js";
import { normalizeLoa } from "../lib/loaConfig.js";
import { normalizeActivityCheck } from "../lib/activityCheckConfig.js";
import { queryExistingSchema } from "../lib/db.js";
import { mergePreservingUnknown, botConfigPayload } from "../lib/dashboardConfigMerge.js";

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
    return {
      ok: false,
      status: response.status,
      error: data.error || "Bot config failed",
      data,
      secretMismatch: response.status === 401 || response.status === 403,
    };
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
  return {
    ok: response.ok,
    status: response.status,
    data,
    secretMismatch: response.status === 401 || response.status === 403,
  };
}

function buildFullPushBody(mirrored) {
  if (!mirrored || typeof mirrored !== "object") return {};
  const keys = [
    "warnChannelId",
    "inviteLeaderboardChannelId",
    "dashboardLogChannelId",
    "levelUpChannelId",
    "levelingEnabled",
    "currencyEnabled",
    "shopEnabled",
    "leveling",
    "currency",
    "shop",
    "birthday",
    "selfRoles",
    "levelRoles",
    "bump",
    "verification",
    "suggestions",
    "tickets",
    "qotd",
    "analytics",
    "ai",
    "automod",
    "applications",
    "loa",
    "activityCheck",
    "systems",
    "auditLog",
    "logging",
  ];
  const out = {};
  for (const k of keys) {
    if (mirrored[k] !== undefined) out[k] = mirrored[k];
  }
  return out;
}

export default async function handler(req, res) {
  try {
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || "Not authenticated" });
    }
    
    const guildId = String(req.query?.guildId || "").trim();
    const mode = String(req.query?.mode || "");

    // New dashboard GET path: strictly read-only and does not run schema initialization.
    if (mode === "readonly" && req.method === "GET") {
      if (!guildId) return res.status(400).json({ error: "Missing guildId" });
      const result = await queryExistingSchema(
        "SELECT value FROM bot_state WHERE key = $1",
        [`guild_config:${guildId}`]
      );
      const value = result.rows[0]?.value;
      const config = value && typeof value === "object" && !Array.isArray(value) ? value : null;
      return res.status(200).json({ config, source: config ? "postgres-read-only" : "empty", found: Boolean(config) });
    }

    // New dashboard save path: update only an existing row and preserve every unrelated key.
    if (mode === "compat" && req.method === "POST") {
      if (!guildId) return res.status(400).json({ error: "Missing guildId" });
      const body = req.body && typeof req.body === "object"
        ? req.body
        : typeof req.body === "string"
          ? (() => { try { return JSON.parse(req.body || "{}"); } catch { return {}; } })()
          : {};
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length === 0) {
        return res.status(400).json({ error: "Configuration patch must be a non-empty object." });
      }
      const currentResult = await queryExistingSchema(
        "SELECT value FROM bot_state WHERE key = $1",
        [`guild_config:${guildId}`]
      );
      const currentValue = currentResult.rows[0]?.value;
      if (!currentValue || typeof currentValue !== "object" || Array.isArray(currentValue)) {
        return res.status(409).json({
          error: "No saved configuration exists for this server. Refusing to create a replacement from empty defaults.",
          code: "CONFIG_NOT_FOUND"
        });
      }
      const merged = mergePreservingUnknown(currentValue, body);
      await queryExistingSchema(
        "UPDATE bot_state SET value = $2::jsonb, updated_at = NOW() WHERE key = $1",
        [`guild_config:${guildId}`, JSON.stringify(merged)]
      );

      const secret = process.env.DASHBOARD_API_SECRET;
      let savedToBot = false;
      let warning = null;
      if (!secret) {
        warning = "Saved to existing storage, but DASHBOARD_API_SECRET is not configured; the bot was not updated.";
      } else {
        try {
          const response = await fetch(`${RAILWAY_API.replace(/\\/$/, "")}/api/guild/${encodeURIComponent(guildId)}/config`, {
            method: "POST",
            headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
            body: JSON.stringify(botConfigPayload(merged)),
            cache: "no-store"
          });
          const data = await response.json().catch(() => ({}));
          savedToBot = response.ok;
          if (!response.ok) warning = data.error || `Bot update failed (HTTP ${response.status}).`;
        } catch (error) {
          warning = error.message || "Could not reach the bot API.";
        }
      }
      return res.status(200).json({ ok: true, config: merged, savedToExistingStorage: true, savedToBot, warning });
    }

    const dashboardSecret = process.env.DASHBOARD_API_SECRET;
    if (!dashboardSecret) {
      return res.status(500).json({
        error: "Missing DASHBOARD_API_SECRET on Vercel — required to talk to the bot",
      });
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
          if (
            JSON.stringify(merged.shop) !== JSON.stringify(stored.shop) ||
            JSON.stringify(merged.applications) !== JSON.stringify(stored.applications)
          ) {
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
          secretMismatch: !!bot.secretMismatch,
          pgError: null,
        });
      }

      if (bot.ok && bot.config) {
        try {
          await saveGuildConfig(guildId, bot.config);
        } catch (_) {}
        return res.status(200).json({
          config: bot.config,
          source: "bot",
          botOnline: true,
          secretMismatch: false,
          pgError,
        });
      }

      return res.status(200).json({
        config: {},
        source: "empty",
        botOnline: false,
        secretMismatch: !!bot.secretMismatch,
        pgError,
        warning: bot.error || pgError || "No config found yet",
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
        const extraKeys = [
          "analytics",
          "qotd",
          "suggestions",
          "tickets",
          "verification",
          "bump",
          "ai",
          "automod",
          "applications",
          "loa",
          "activityCheck",
          "systems",
          "auditLog",
          "logging",
        ];
        let needsResave = false;
        for (const k of extraKeys) {
          if (body[k] && typeof body[k] === "object") {
            if (k === "ai") {
              mirrored.ai = { ...(mirrored.ai || {}), ...body.ai };
              if (body.ai.staff && typeof body.ai.staff === "object") {
                mirrored.ai.staff = {
                  ...(mirrored.ai.staff || {}),
                  ...body.ai.staff,
                  allowedActions: {
                    ...((mirrored.ai.staff && mirrored.ai.staff.allowedActions) || {}),
                    ...(body.ai.staff.allowedActions || {}),
                  },
                };
              }
            } else if (k === "automod") {
              mirrored.automod = {
                ...(mirrored.automod || {}),
                ...body.automod,
              };
            } else if (k === "applications") {
              mirrored.applications = {
                ...(mirrored.applications || {}),
                ...body.applications,
                positions: Array.isArray(body.applications.positions)
                  ? body.applications.positions
                  : (mirrored.applications && mirrored.applications.positions) || [],
                questions: Array.isArray(body.applications.questions)
                  ? body.applications.questions
                  : (mirrored.applications && mirrored.applications.questions) || [],
              };
            } else if (k === "loa") {
              mirrored.loa = normalizeLoa(body.loa, mirrored.loa || {});
            } else if (k === "activityCheck") {
              mirrored.activityCheck = normalizeActivityCheck(
                body.activityCheck,
                mirrored.activityCheck || {}
              );
            } else if (k === "logging") {
              mirrored.logging = { ...(mirrored.logging || {}), ...body.logging };
              if (body.logging.replaceCategories && body.logging.categories) {
                mirrored.logging.categories = body.logging.categories;
              }
              if (body.logging.replaceEvents && body.logging.events) {
                mirrored.logging.events = body.logging.events;
              }
            } else {
              mirrored[k] = { ...(mirrored[k] || {}), ...body[k] };
            }
            needsResave = true;
          }
        }
        if (body.dashboardLogChannelId !== undefined) {
          mirrored.dashboardLogChannelId = body.dashboardLogChannelId || null;
          needsResave = true;
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

      const pushBody = buildFullPushBody(mirrored);

      let botOk = false;
      let botData = {};
      let botStatus = null;
      let secretMismatch = false;
      try {
        let pushed = await pushBotConfig(guildId, dashboardSecret, pushBody);
        if (!pushed.ok && (pushed.status === 502 || pushed.status === 503 || pushed.status === 504)) {
          await new Promise((r) => setTimeout(r, 800));
          pushed = await pushBotConfig(guildId, dashboardSecret, pushBody);
        }
        botOk = pushed.ok;
        botStatus = pushed.status;
        botData = pushed.data || {};
        secretMismatch = !!pushed.secretMismatch;

        if (pushed.ok && botData.config) {
          const safe = preferWebsiteShop(mirrored, botData.config);
          try {
            await saveGuildConfig(guildId, safe);
            mirrored = safe;
          } catch (_) {}
        }
      } catch (botErr) {
        console.error("Bot config POST failed:", botErr.message);
        botData = { error: botErr.message };
      }

      const systemsInPush = [
        "loa",
        "applications",
        "automod",
        "activityCheck",
        "ai",
        "tickets",
        "verification",
        "systems",
        "auditLog",
        "logging",
      ]
        .filter((k) => pushBody[k] != null)
        .join(", ");

      let warning = null;
      if (!botOk) {
        if (secretMismatch) {
          warning =
            "Saved to website Postgres, but live bot push got 401. Set the SAME DASHBOARD_API_SECRET on Vercel and Railway.";
        } else {
          warning =
            "Saved on the website (Postgres). Live bot push failed — check BOT_API_URL / Railway.";
        }
      }

      return res.status(200).json({
        ok: true,
        config: mirrored,
        savedToPostgres: true,
        savedToBot: botOk,
        botHttpStatus: botStatus,
        secretMismatch,
        systemsPushed: systemsInPush || null,
        logResult: botData.logResult || null,
        changes: botData.changes || null,
        warning,
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
