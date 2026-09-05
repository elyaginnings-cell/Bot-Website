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
      return res.status(500).json({ error: "Missing DASHBOARD_API_SECRET" });
    }

    if (req.method === "GET") {
      const response = await fetch(`${RAILWAY_API}/api/presence`, {
        headers: { Authorization: `Bearer ${dashboardSecret}` },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({ error: data.error || "Failed to load presence" });
      }
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const response = await fetch(`${RAILWAY_API}/api/presence`, {
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
  } catch (error) {
    console.error("Presence proxy error:", error);
    return res.status(500).json({ error: error.message || "Failed" });
  }
}
