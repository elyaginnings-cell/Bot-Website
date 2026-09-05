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

export default async function handler(req, res) {
  try {
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || "Not authenticated" });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const dashboardSecret = process.env.DASHBOARD_API_SECRET;
    if (!dashboardSecret) {
      return res.status(500).json({ error: "Missing DASHBOARD_API_SECRET" });
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

    let bot = null;
    let botError = null;
    try {
      const response = await fetch(`${RAILWAY_API}/api/status`, {
        headers: { Authorization: `Bearer ${dashboardSecret}` },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) bot = data;
      else botError = data.error || `Bot status ${response.status}`;
    } catch (err) {
      botError = err.message || "Bot unreachable";
    }

    const botStorage = bot?.storage || {};
    const botUsingPg = !!botStorage.usingPostgres;
    const botHasUrl = botStorage.hasDatabaseUrl !== false && bot != null
      ? botStorage.hasDatabaseUrl !== false
      : null;

    // Prefer website Postgres for the Memory badge (dashboard saves live there)
    let label = "…";
    if (websitePostgresOk && botUsingPg) label = "Postgres ✓";
    else if (websitePostgresOk) label = "Website Postgres ✓";
    else if (botUsingPg) label = "Bot Postgres ✓";
    else if (websiteHasDb && websiteError) label = "DB error";
    else if (!websiteHasDb && botHasUrl === false) label = "File only ⚠️";
    else if (bot) label = "Online";
    else label = "Offline";

    return res.status(200).json({
      online: !!bot?.online,
      bot,
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
    });
  } catch (error) {
    console.error("Bot status error:", error);
    return res.status(500).json({ error: error.message || "Failed" });
  }
}
