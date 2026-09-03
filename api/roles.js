import { requireAnySession } from "../lib/requireAuth.js";

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
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const guildId = req.query?.guildId;
    if (!guildId) return res.status(400).json({ error: "Missing guildId" });

    const response = await fetch(`${RAILWAY_API}/api/guild/${guildId}/roles`, {
      headers: { Authorization: `Bearer ${dashboardSecret}` },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json(data);

    return res.status(200).json(data);
  } catch (error) {
    console.error("Roles API error:", error);
    return res.status(500).json({ error: "Failed to load roles" });
  }
}
