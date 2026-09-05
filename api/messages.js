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

    let guildId = req.query?.guildId;
    let channelId = req.query?.channelId;

    const body =
      req.method === "POST"
        ? typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {}
        : {};

    if (req.method === "POST") {
      if (!guildId) guildId = body.guildId;
      if (!channelId) channelId = body.channelId;
    }

    if (req.method === "POST" && body.action && ["warn", "mute", "ban", "kick"].includes(String(body.action))) {
      if (!guildId || !body.userId) {
        return res.status(400).json({ error: "Missing guildId or userId" });
      }
      const response = await fetch(`${RAILWAY_API}/api/guild/${guildId}/punish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dashboardSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: body.action,
          userId: body.userId,
          reason: body.reason,
          duration: body.duration,
          evidence: body.evidence || null,
          moderatorTag: body.moderatorTag || "Dashboard",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status).json(data);
      return res.status(200).json(data);
    }

    if (!guildId || !channelId) {
      return res.status(400).json({ error: "Missing guildId or channelId" });
    }

    const base = `${RAILWAY_API}/api/guild/${guildId}/channels/${channelId}/messages`;

    if (req.method === "GET") {
      const params = new URLSearchParams();
      if (req.query.limit) params.set("limit", String(req.query.limit));
      if (req.query.before) params.set("before", String(req.query.before));
      if (req.query.after) params.set("after", String(req.query.after));
      const qs = params.toString();
      const response = await fetch(qs ? `${base}?${qs}` : base, {
        headers: { Authorization: `Bearer ${dashboardSecret}` },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status).json(data);
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const { guildId: _g, channelId: _c, ...payload } = body;
      const response = await fetch(base, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dashboardSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status).json(data);
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Messages API error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Failed",
    });
  }
}
