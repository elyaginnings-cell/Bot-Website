import { requireAnySession } from "../lib/requireAuth.js";
import { readSession } from "../lib/session.js";

const RAILWAY_API =
  process.env.BOT_API_URL ||
  "https://discord-bot-production-1488.up.railway.app";

const PERM_MANAGE_GUILD = 1n << 5n;
const PERM_ADMIN = 1n << 3n;
const DEFAULT_BOT_PERMISSIONS = "8";

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

function isInviteRequest(req) {
  const url = String(req.url || "");
  const resource = String(req.query?.resource || "");
  return (
    resource === "invite" ||
    url.includes("/invite-bot") ||
    url.includes("resource=invite")
  );
}

function hasAdminLike(permissions) {
  try {
    const p = BigInt(permissions || "0");
    return (p & PERM_ADMIN) === PERM_ADMIN || (p & PERM_MANAGE_GUILD) === PERM_MANAGE_GUILD;
  } catch {
    return false;
  }
}

function inviteUrl(clientId, guildId, permissions) {
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: permissions || DEFAULT_BOT_PERMISSIONS,
    scope: "bot applications.commands",
  });
  if (guildId) {
    params.set("guild_id", String(guildId));
    params.set("disable_guild_select", "true");
  }
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

async function fetchBotGuildIds() {
  const secret = process.env.DASHBOARD_API_SECRET;
  if (!secret) return new Set();
  try {
    const res = await fetch(`${RAILWAY_API}/api/guilds`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) return new Set();
    const data = await res.json();
    const list = Array.isArray(data.guilds) ? data.guilds : [];
    return new Set(list.map((g) => String(g.id)));
  } catch {
    return new Set();
  }
}

async function handleInvite(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({
      error: "DISCORD_CLIENT_ID is not configured on the website.",
    });
  }

  const session = readSession(req);
  const token = session?.discordToken;

  if (!token) {
    return res.status(200).json({
      ok: false,
      needsDiscord: true,
      clientId,
      genericInvite: inviteUrl(clientId, null, DEFAULT_BOT_PERMISSIONS),
      guilds: [],
      message:
        "Log in with Discord (so we can see servers you manage). Email-only login cannot list your servers.",
    });
  }

  const guildRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (guildRes.status === 401) {
    return res.status(200).json({
      ok: false,
      needsDiscord: true,
      clientId,
      genericInvite: inviteUrl(clientId, null, DEFAULT_BOT_PERMISSIONS),
      guilds: [],
      message: "Discord session expired. Log out and log in with Discord again.",
    });
  }

  if (!guildRes.ok) {
    const text = await guildRes.text().catch(() => "");
    console.error("[invite-bot] guilds fetch", guildRes.status, text);
    return res.status(502).json({ error: "Could not load your Discord servers." });
  }

  const allGuilds = await guildRes.json();
  const botGuildIds = await fetchBotGuildIds();

  const guilds = (Array.isArray(allGuilds) ? allGuilds : [])
    .filter((g) => hasAdminLike(g.permissions))
    .map((g) => ({
      id: String(g.id),
      name: g.name || "Server",
      icon: g.icon || null,
      owner: !!g.owner,
      botInServer: botGuildIds.has(String(g.id)),
      inviteUrl: inviteUrl(clientId, g.id, DEFAULT_BOT_PERMISSIONS),
    }))
    .sort((a, b) => {
      if (a.botInServer !== b.botInServer) return a.botInServer ? 1 : -1;
      return String(a.name).localeCompare(String(b.name));
    });

  return res.status(200).json({
    ok: true,
    needsDiscord: false,
    clientId,
    genericInvite: inviteUrl(clientId, null, DEFAULT_BOT_PERMISSIONS),
    guilds,
    message: null,
  });
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

    // ---- Invite bot (merged from api/invite-bot.js — Hobby plan 12 fn limit) ----
    if (isInviteRequest(req)) {
      return handleInvite(req, res);
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
