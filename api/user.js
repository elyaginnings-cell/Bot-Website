import { query } from "../lib/db.js";
import { publicUser } from "../lib/accounts.js";
import { clearSessionCookies, readSession, setSessionCookies } from "../lib/session.js";
import { isStaffEmail, isStaffDiscordId, isWebsiteOwnerEmail } from "../lib/staffAuth.js";
import customerAccountHandler from "../platform/customer-account.js";
import customerServersHandler from "../platform/customer-servers.js";
import ownerPlansHandler from "../platform/owner-plans.js";
import ownerCustomersHandler from "../platform/owner-customers.js";
import billingHandler from "../platform/billing.js";
import billingWebhookHandler from "../platform/billing-webhook.js";
import storageHandler from "../platform/storage.js";

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

function shapeUser(account, websiteOwner, staff, serverAccess, discordConnected) {
  return {
    ...publicUser(account),
    role: websiteOwner ? "owner" : staff ? "staff" : "member",
    website_owner: websiteOwner,
    server_access: serverAccess,
    discord_connected: discordConnected,
  };
}

async function handleUser(req, res) {
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

    const hasDatabase = Boolean(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || process.env.POSTGRES_URL);
    if (session.accountId && hasDatabase) {
      const result = await query(
        `SELECT id, email, discord_id, username, global_name, avatar
         FROM accounts WHERE id = $1`,
        [session.accountId]
      );
      const account = result.rows[0];
      if (!account) {
        clearSessionCookies(res);
        return res.status(401).json({ authenticated: false });
      }

      // Re-evaluate access on every profile check. This upgrades older
      // sessions immediately when an owner or staff allowlist changes.
      const websiteOwner = isWebsiteOwnerEmail(account.email);
      const staff = websiteOwner || isStaffEmail(account.email) || isStaffDiscordId(account.discord_id);
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

      const serverAccess = await getDiscordServerAccess(session.discordToken);
      return res.status(200).json({
        authenticated: true,
        user: shapeUser(account, websiteOwner, staff, serverAccess, Boolean(session.discordToken)),
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
      const websiteOwner = isWebsiteOwnerEmail(account.email);
      const staff = websiteOwner || isStaffEmail(account.email) || isStaffDiscordId(account.discord_id);
      const serverAccess = await getDiscordServerAccess(session.discordToken);
      return res.status(200).json({
        authenticated: true,
        user: shapeUser(account, websiteOwner, staff, serverAccess),
      });
    }

    return res.status(401).json({ authenticated: false });
  } catch (error) {
    console.error("User API error:", error);
    return res.status(500).json({ authenticated: false });
  }
}


export const config = { api: { bodyParser: false } };

async function parsePlatformRequestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { req.body = JSON.parse(req.body || "{}"); return req.body; }
    catch { throw new Error("Request body must be valid JSON."); }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) { req.body = {}; return req.body; }
  try { req.body = JSON.parse(raw); return req.body; }
  catch { throw new Error("Request body must be valid JSON."); }
}

const platformRoutes = {
  "customer-account": customerAccountHandler,
  "customer-servers": customerServersHandler,
  "owner-plans": ownerPlansHandler,
  "owner-customers": ownerCustomersHandler,
  billing: billingHandler,
  "billing-webhook": billingWebhookHandler,
  storage: storageHandler,
};

export default async function handler(req, res) {
  const resource = String(req.query?.resource || "");
  const platformHandler = platformRoutes[resource];
  if (platformHandler) {
    try {
      if (resource !== "billing-webhook" && ["POST", "PUT", "PATCH"].includes(req.method)) {
        await parsePlatformRequestBody(req);
      }
      return await platformHandler(req, res);
    } catch (error) {
      console.error("Platform route error:", resource, error);
      return res.status(error.status || 400).json({
        error: error.message || "Invalid platform request.",
        code: error.code || undefined,
      });
    }
  }
  return handleUser(req, res);
}
