import { requireAnySession } from "../lib/requireAuth.js";

const RAILWAY_API =
  process.env.BOT_API_URL ||
  "https://discord-bot-production-1488.up.railway.app";

function websiteDbConfigured() {
  const url = (
    process.env.DATABASE_PUBLIC_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ""
  ).trim();
  return Boolean(url && url.includes("://"));
}

function isPresenceRequest(req) {
  const url = String(req.url || "");
  const resource = String(req.query?.resource || "");
  return resource === "presence" || url.includes("/presence") || url.includes("resource=presence");
}

/** Probe bot without requiring full status auth. */
async function probeBotOnline(dashboardSecret) {
  const base = RAILWAY_API.replace(/\/$/, "");
  let bot = null;
  let botError = null;
  let secretMismatch = false;
  let reachable = false;

  // 1) Authenticated status
  try {
    const response = await fetch(`${base}/api/status`, {
      headers: { Authorization: `Bearer ${dashboardSecret}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      bot = data;
      reachable = true;
      return { bot, botError: null, secretMismatch: false, reachable: true };
    }
    if (response.status === 401 || response.status === 403) {
      secretMismatch = true;
      botError = "DASHBOARD_API_SECRET mismatch between website and Railway bot";
    } else {
      botError = data.error || `Bot status HTTP ${response.status}`;
    }
  } catch (err) {
    botError = err.message || "Bot unreachable";
  }

  // 2) Public root health (bot returns { online: true } without auth)
  try {
    const response = await fetch(`${base}/`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && (data.online === true || data.service)) {
      reachable = true;
      bot = {
        online: true,
        ready: true,
        source: "root-probe",
        storage: data.storage || {},
        bot: data.bot || null,
        id: data.id || data.bot?.id || null,
      };
      if (secretMismatch) {
        botError =
          "Bot is online, but API auth failed. Set the SAME DASHBOARD_API_SECRET on Vercel and Railway.";
      } else if (!botError) {
        botError = null;
      }
    }
  } catch (err) {
    if (!botError) botError = err.message || "Bot unreachable";
  }

  // 3) /health without auth (some deployments)
  if (!reachable) {
    try {
      const response = await fetch(`${base}/health`, { cache: "no-store" });
      if (response.ok) {
        reachable = true;
        bot = { online: true, ready: true, source: "health-probe" };
      }
    } catch (_) {}
  }

  return { bot, botError, secretMismatch, reachable };
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
      return res.status(500).json({
        error: "Missing DASHBOARD_API_SECRET on Vercel",
        online: false,
        hint: "Set DASHBOARD_API_SECRET to the same value as on the Railway Discord bot service",
      });
    }

    // ---- Presence ----
    if (isPresenceRequest(req)) {
      if (req.method === "GET") {
        const response = await fetch(`${RAILWAY_API.replace(/\/$/, "")}/api/presence`, {
          headers: { Authorization: `Bearer ${dashboardSecret}` },
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error || "Failed to load presence",
            hint:
              response.status === 401
                ? "DASHBOARD_API_SECRET mismatch — bot is likely online but API auth failed"
                : null,
          });
        }
        return res.status(200).json(data);
      }

      if (req.method === "POST") {
        const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
        const response = await fetch(`${RAILWAY_API.replace(/\/$/, "")}/api/presence`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${dashboardSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: body.status,
            activityType: body.activityType,
            activityName: body.activityName,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return res.status(response.status).json({ error: data.error || "Failed to update presence" });
        }
        return res.status(200).json(data);
      }

      return res.status(405).json({ error: "Method not allowed" });
    }

    // ---- Bot status ----
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const websiteHasDb = websiteDbConfigured();
    let websitePostgresOk = false;
    let websiteError = null;
    if (websiteHasDb) {
      try {
        const { query } = await import("../lib/db.js");
        await query("SELECT 1 AS ok");
        websitePostgresOk = true;
      } catch (err) {
        websiteError = err.message || String(err);
      }
    }

    const probe = await probeBotOnline(dashboardSecret);
    const bot = probe.bot;
    const botError = probe.botError;

    const botStorage = bot?.storage || {};
    const botUsingPg = !!botStorage.usingPostgres;
    const botHasUrl =
      botStorage.hasDatabaseUrl !== false && bot != null
        ? botStorage.hasDatabaseUrl !== false
        : null;

    let label = "…";
    if (probe.secretMismatch && probe.reachable) label = "Online ⚠ secret mismatch";
    else if (websitePostgresOk && botUsingPg) label = "Postgres ✓";
    else if (websitePostgresOk) label = "Website Postgres ✓";
    else if (botUsingPg) label = "Bot Postgres ✓";
    else if (websiteHasDb && websiteError) label = "DB error";
    else if (!websiteHasDb && botHasUrl === false) label = "File only ⚠️";
    else if (bot?.online || probe.reachable) label = "Online";
    else label = "Offline";

    const clientId =
      process.env.DISCORD_CLIENT_ID || bot?.bot?.id || bot?.id || null;

    return res.status(200).json({
      online: !!(bot?.online || probe.reachable),
      bot,
      clientId,
      botApiUrl: RAILWAY_API,
      secretMismatch: !!probe.secretMismatch,
      storage: {
        usingPostgres: websitePostgresOk || botUsingPg,
        websitePostgres: websitePostgresOk,
        websiteHasDatabaseUrl: websiteHasDb,
        websiteError,
        botUsingPostgres: botUsingPg,
        botHasDatabaseUrl: botHasUrl,
        hasDatabaseUrl: websiteHasDb || botHasUrl === true,
        label,
      },
      botError,
      hint: probe.secretMismatch
        ? "Copy DASHBOARD_API_SECRET from Railway → Vercel (same value). Saves still work via shared Postgres if DATABASE_URL matches."
        : null,
    });
  } catch (error) {
    console.error("Bot status / presence error:", error);
    return res.status(500).json({ error: error.message || "Failed" });
  }
}
