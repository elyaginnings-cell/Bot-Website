import { requireAnySession } from "../lib/requireAuth.js";

const RAILWAY_API =
  process.env.BOT_API_URL ||
  "https://discord-bot-production-1488.up.railway.app";

function botToken() {
  return (
    process.env.DISCORD_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.DISCORD_TOKEN ||
    ""
  );
}

async function discord(path) {
  const token = botToken();
  if (!token) {
    const err = new Error("DISCORD_BOT_TOKEN not set");
    err.status = 500;
    throw err;
  }
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bot ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Discord ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function isMetaRequest(req) {
  const url = String(req.url || "");
  const resource = String(req.query?.resource || "");
  return resource === "meta" || url.includes("/guild-meta") || url.includes("resource=meta");
}

export default async function handler(req, res) {
  try {
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({
        error: err.message || "Not authenticated",
        code: err.code || undefined,
      });
    }

    // ---- Guild meta (merged from api/guild-meta.js) ----
    if (isMetaRequest(req)) {
      if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const guildId = String(req.query?.guildId || "").trim();
      if (!guildId) return res.status(400).json({ error: "Missing guildId" });

      let roles = [];
      let emojis = [];
      try {
        roles = await discord(`/guilds/${guildId}/roles`);
      } catch (_) {
        roles = [];
      }
      try {
        emojis = await discord(`/guilds/${guildId}/emojis`);
      } catch (_) {
        emojis = [];
      }

      const roleList = (Array.isArray(roles) ? roles : [])
        .map((r) => ({
          id: String(r.id),
          name: r.name,
          color: r.color || 0,
          position: r.position || 0,
          hoist: !!r.hoist,
          mentionable: !!r.mentionable,
          managed: !!r.managed,
        }))
        .sort((a, b) => b.position - a.position);

      const emojiList = (Array.isArray(emojis) ? emojis : []).map((e) => ({
        id: String(e.id),
        name: e.name,
        animated: !!e.animated,
        url: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "png"}?size=48`,
      }));

      return res.status(200).json({ roles: roleList, emojis: emojiList });
    }

    // ---- Original guilds list ----
    const dashboardSecret = process.env.DASHBOARD_API_SECRET;
    if (!dashboardSecret) {
      return res.status(500).json({ error: "Missing DASHBOARD_API_SECRET" });
    }

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

    const guilds = botGuilds.map((guild) => ({
      id: guild.id,
      name: guild.name || "Unknown Server",
      icon: guild.icon || null,
      owner: false,
      approximate_member_count: Number(
        guild.memberCount || guild.approximate_member_count || 0
      ),
      approximate_presence_count: Number(guild.approximate_presence_count || 0),
    }));

    return res.status(200).json({ guilds });
  } catch (error) {
    console.error("Guild API error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Failed to retrieve Discord servers",
    });
  }
}
