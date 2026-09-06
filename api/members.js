import { requireAnySession } from "../lib/requireAuth.js";

const RAILWAY_API =
  process.env.BOT_API_URL ||
  "https://discord-bot-production-1488.up.railway.app";

export default async function handler(req, res) {
  try {
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({
        error: err.message || "Not authenticated",
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const dashboardSecret = process.env.DASHBOARD_API_SECRET;
    if (!dashboardSecret) {
      return res.status(500).json({ error: "Missing DASHBOARD_API_SECRET" });
    }

    const guildId = req.query?.guildId;
    if (!guildId) {
      return res.status(400).json({ error: "Missing guildId" });
    }

    const params = new URLSearchParams();
    if (req.query.q) params.set("q", String(req.query.q));
    if (req.query.limit) params.set("limit", String(req.query.limit));
    else params.set("limit", "150");
    const qs = params.toString();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    let response;
    try {
      response = await fetch(
        `${RAILWAY_API}/api/guild/${guildId}/members?${qs}`,
        {
          headers: { Authorization: `Bearer ${dashboardSecret}` },
          cache: "no-store",
          signal: controller.signal,
        }
      );
    } catch (err) {
      clearTimeout(timer);
      const msg =
        err.name === "AbortError"
          ? "Bot timed out loading members (12s). Redeploy the bot or check Railway logs."
          : err.message || "Could not reach bot";
      return res.status(504).json({ error: msg });
    }
    clearTimeout(timer);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json(
        data.error ? data : { error: data.error || `Bot returned ${response.status}` }
      );
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Members API error:", error);
    return res.status(500).json({
      error: error.message || "Failed to load members",
    });
  }
}
