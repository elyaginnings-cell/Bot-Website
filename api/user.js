import { query } from "../lib/db.js";
import { publicUser } from "../lib/accounts.js";
import { clearSessionCookies, readSession, setSessionCookies } from "../lib/session.js";
import { isStaffEmail, isStaffDiscordId, isWebsiteOwnerEmail } from "../lib/staffAuth.js";

const ADMIN_PERMISSION = 1n << 3n;
const MANAGE_GUILD_PERMISSION = 1n << 5n;

async function getDiscordServerAccess(token) {
  if (!token) return [];
  try {
    const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const guilds = await response.json();
    return (Array.isArray(guilds) ? guilds : []).map((guild) => {
      let permissions = 0n;
      try { permissions = BigInt(guild.permissions || "0"); } catch {}
      const administrator = (permissions & ADMIN_PERMISSION) === ADMIN_PERMISSION;
      const manager = (permissions & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION;
      const owner = guild.owner === true;
      return {
        id: String(guild.id),
        name: guild.name || "Discord server",
        rank: owner ? "Owner" : administrator ? "Administrator" : manager ? "Server Manager" : "Member",
        owner,
        administrator,
        manager,
      };
    }).sort((a, b) => {
      const rank = { Owner: 0, Administrator: 1, "Server Manager": 2, Member: 3 };
      return rank[a.rank] - rank[b.rank] || a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Discord server access lookup failed:", error);
    return [];
  }
}

function shapeUser(account, session, serverAccess) {
  const websiteOwner = isWebsiteOwnerEmail(account.email) || session.owner === true;
  const staff = websiteOwner || isStaffEmail(account.email) || isStaffDiscordId(account.discord_id) || session.staff === true;
  return {
    ...publicUser(account),
    role: websiteOwner ? "owner" : staff ? "staff" : "member",
    website_owner: websiteOwner,
    server_access: serverAccess,
  };
}

export default async function handler(req, res) {
  try {
    if (!process.env.SESSION_SECRET) {
      return res.status(500).json({ authenticated: false, error: "Missing SESSION_SECRET" });
    }

    let session;
    try {
      session = readSession(req);
    } catch {
      clearSessionCookies(res);
      return res.status(401).json({ authenticated: false });
    }

    if (!session) return res.status(401).json({ authenticated: false });

    if (session.accountId && process.env.DATABASE_URL) {
      const result = await query(
        `SELECT id, email, discord_id, username, global_name, avatar
         FROM accounts WHERE id = $1`,
        [session.accountId]
      );
      if (!result.rows[0]) {
        clearSessionCookies(res);
        return res.status(401).json({ authenticated: false });
      }
      const account = result.rows[0];
      const websiteOwner = isWebsiteOwnerEmail(account.email);
      const staff = websiteOwner || isStaffEmail(account.email) || isStaffDiscordId(account.discord_id);
      // Refresh older sessions after owner/staff allowlist changes so API
      // authorization and the visible account role cannot disagree.
      if (session.staff !== staff || session.owner !== websiteOwner) {
        setSessionCookies(res, {
          v: 1,
          accountId: session.accountId,
          method: session.method || "account",
          discordId: account.discord_id || null,
          staff,
          owner: websiteOwner,
        }, session.discordToken);
        session = { ...session, staff, owner: websiteOwner };
      }
      const websiteOwner = isWebsiteOwnerEmail(account.email);
      const staff = websiteOwner || isStaffEmail(account.email) || isStaffDiscordId(account.discord_id);
      if (session.staff !== staff || session.owner !== websiteOwner) {
        setSessionCookies(res, {
          v: 1,
          accountId: session.accountId || null,
          method: "discord",
          discordId: account.discord_id,
          staff,
          owner: websiteOwner,
        }, session.discordToken);
        session = { ...session, staff, owner: websiteOwner };
      }
      const serverAccess = await getDiscordServerAccess(session.discordToken);
      return res.status(200).json({
        authenticated: true,
        user: shapeUser(account, session, serverAccess),
      });
    }

    if (session.discordToken) {
      const response = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${session.discordToken}` },
        cache: "no-store",
      });
      if (!response.ok) {
        clearSessionCookies(res);
        return res.status(401).json({ authenticated: false });
      }
      const data = await response.json();
      const account = {
        id: data.id,
        email: data.email || null,
        discord_id: data.id,
        username: data.username,
        global_name: data.global_name,
        avatar: data.avatar,
      };
      const serverAccess = await getDiscordServerAccess(session.discordToken);
      return res.status(200).json({
        authenticated: true,
        user: shapeUser(account, session, serverAccess),
      });
    }

    return res.status(401).json({ authenticated: false });
  } catch (error) {
    console.error("User API error:", error);
    return res.status(500).json({ authenticated: false });
  }
}
