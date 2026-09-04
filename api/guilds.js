import { requireAnySession } from "../lib/requireAuth.js";

const RAILWAY_API =
  process.env.BOT_API_URL ||
  "https://discord-bot-production-1488.up.railway.app";

export default async function handler(req, res) {
  try {
    const dashboardSecret = process.env.DASHBOARD_API_SECRET;

    if (!dashboardSecret) {
      return res.status(500).json({
        error: "Missing DASHBOARD_API_SECRET",
      });
    }

    // The dashboard itself is restricted to approved staff.
    // We do NOT require the user's personal Discord OAuth token here.
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({
        error: err.message || "Not authenticated",
        code: err.code || undefined,
      });
    }

    // Ask the Railway bot which Discord servers it is actually in.
    const railwayResponse = await fetch(`${RAILWAY_API}/api/guilds`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${dashboardSecret}`,
      },
      cache: "no-store",
    });

    if (!railwayResponse.ok) {
      console.error(
        "Railway guild request failed:",
        railwayResponse.status
      );

      return res.status(502).json({
        error: "Could not contact Discord bot",
      });
    }

    const railwayData = await railwayResponse.json();

    const botGuilds = Array.isArray(railwayData.guilds)
      ? railwayData.guilds
      : [];

    const guilds = botGuilds.map((guild) => ({
      id: guild.id,
      name: guild.name || "Unknown Server",
      icon: guild.icon || null,

      // Staff members are authorized by the dashboard,
      // not by Discord server ownership.
      owner: false,

      approximate_member_count: Number(
        guild.memberCount ||
        guild.approximate_member_count ||
        0
      ),

      approximate_presence_count: Number(
        guild.approximate_presence_count ||
        0
      ),
    }));

    return res.status(200).json({ guilds });
  } catch (error) {
    console.error("Guild API error:", error);

    return res.status(500).json({
      error: "Failed to retrieve Discord servers",
    });
  }
}