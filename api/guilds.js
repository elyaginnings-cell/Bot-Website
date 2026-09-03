import { requireDiscordSession } from "../lib/requireAuth.js";

const RAILWAY_API =
  process.env.BOT_API_URL ||
  "https://discord-bot-production-1488.up.railway.app";

export default async function handler(req, res) {
  try {
    const dashboardSecret = process.env.DASHBOARD_API_SECRET;
    if (!dashboardSecret) {
      return res.status(500).json({ error: "Missing DASHBOARD_API_SECRET" });
    }

    let discordToken;
    try {
      ({ discordToken } = requireDiscordSession(req));
    } catch (err) {
      return res.status(err.status || 401).json({
        error: err.message || "Not authenticated",
        code: err.code || undefined,
      });
    }

    const discordResponse = await fetch(
      "https://discord.com/api/users/@me/guilds?with_counts=true",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${discordToken}` },
      }
    );

    if (!discordResponse.ok) {
      if (discordResponse.status === 401) {
        return res.status(401).json({
          error: "Discord session expired. Link Discord again.",
          code: "DISCORD_EXPIRED",
        });
      }
      return res.status(discordResponse.status).json({
        error: "Discord rejected request",
      });
    }

    const userGuilds = await discordResponse.json();

    const railwayResponse = await fetch(`${RAILWAY_API}/api/guilds`, {
      method: "GET",
      headers: { Authorization: `Bearer ${dashboardSecret}` },
      cache: "no-store",
    });

    if (!railwayResponse.ok) {
      console.error("Railway guild request failed:", railwayResponse.status);
      return res.status(502).json({ error: "Could not contact Discord bot" });
    }

    const railwayData = await railwayResponse.json();
    const botGuilds = Array.isArray(railwayData.guilds) ? railwayData.guilds : [];
    const botGuildMap = new Map(botGuilds.map((guild) => [guild.id, guild]));

    const ADMINISTRATOR = BigInt(0x8);
    const MANAGE_GUILD = BigInt(0x20);

    const manageableGuilds = userGuilds
      .filter((guild) => {
        try {
          const permissions = BigInt(guild.permissions || "0");
          const canManage =
            (permissions & ADMINISTRATOR) !== BigInt(0) ||
            (permissions & MANAGE_GUILD) !== BigInt(0);
          return canManage && botGuildMap.has(guild.id);
        } catch {
          return false;
        }
      })
      .map((guild) => {
        const botGuild = botGuildMap.get(guild.id);
        return {
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          owner: Boolean(guild.owner),
          approximate_member_count: Number(
            guild.approximate_member_count || botGuild?.memberCount || 0
          ),
          approximate_presence_count: Number(
            guild.approximate_presence_count || 0
          ),
        };
      });

    return res.status(200).json({ guilds: manageableGuilds });
  } catch (error) {
    console.error("Guild API error:", error);
    return res.status(500).json({ error: "Failed to retrieve Discord servers" });
  }
}
