import { requireAnySession } from "../lib/requireAuth.js";

const RAILWAY_API =
  process.env.BOT_API_URL ||
  "https://discord-bot-production-1488.up.railway.app";

export default async function handler(req, res) {
  try {
    requireAnySession(req);

    const dashboardSecret = process.env.DASHBOARD_API_SECRET;

    if (!dashboardSecret) {
      return res.status(500).json({
        error: "Missing DASHBOARD_API_SECRET",
      });
    }

    /*
     * The dashboard is high-staff-only.
     *
     * We no longer need the user's Discord OAuth token here.
     * The Railway bot provides the servers it is currently in.
     */
    const railwayResponse = await fetch(
      `${RAILWAY_API}/api/guilds`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${dashboardSecret}`,
        },
        cache: "no-store",
      }
    );

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

    /*
     * Every guild returned by the bot is available to authorized
     * high staff.
     */
    const guilds = botGuilds.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon || null,
      owner: false,
      approximate_member_count: Number(
        guild.memberCount || guild.approximate_member_count || 0
      ),
      approximate_presence_count: Number(
        guild.presenceCount ||
          guild.approximate_presence_count ||
          0
      ),
    }));

    return res.status(200).json({
      guilds,
    });
  } catch (error) {
    console.error("Guild API error:", error);

    return res.status(error.status || 500).json({
      error: error.message || "Failed to retrieve Discord servers",
      code: error.code || undefined,
    });
  }
}