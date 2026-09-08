import { requireAnySession } from "../lib/requireAuth.js";

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
  } catch (error) {
    console.error("[guild-meta]", error.message || error);
    return res.status(error.status || 500).json({ error: error.message || "Failed" });
  }
}
