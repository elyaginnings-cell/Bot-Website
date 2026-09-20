import { requireAnySession } from "../lib/requireAuth.js";
import { readSession } from "../lib/session.js";

const RAILWAY_API =
  process.env.BOT_API_URL ||
  "https://discord-bot-production-1488.up.railway.app";

/** Manage Guild permission bit */
const PERM_MANAGE_GUILD = 1n << 5n;
/** Administrator */
const PERM_ADMIN = 1n << 3n;

/** Default bot invite permissions (broad management — user can lower on Discord screen) */
const DEFAULT_BOT_PERMISSIONS = String(
  // Administrator — simplest for a full dashboard bot
  8
);

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
        // Servers without the bot first, then A–Z
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
  } catch (error) {
    console.error("[invite-bot]", error);
    return res.status(500).json({
      error: error.message || "Failed to build invite list",
    });
  }
}
