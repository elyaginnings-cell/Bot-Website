import { query } from "./db.js";
import { readSession } from "./session.js";
import { isWebsiteOwnerEmail } from "./staffAuth.js";

const ADMIN = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;

function fail(message, status = 401, code = "CUSTOMER_AUTH_REQUIRED") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export async function requireCustomerAccount(req) {
  let session;
  try {
    session = readSession(req);
  } catch {
    throw fail("Your session is invalid. Please sign in again.");
  }
  if (!session?.accountId) {
    throw fail("Sign in to your customer account to continue.");
  }

  const result = await query(
    `SELECT id, email, discord_id, username, global_name, avatar
     FROM accounts WHERE id = $1`,
    [session.accountId]
  );
  const account = result.rows[0];
  if (!account) throw fail("Your account could not be found. Please sign in again.");

  return {
    session,
    account,
    isOwner: isWebsiteOwnerEmail(account.email),
  };
}

export async function requireWebsiteOwner(req) {
  const customer = await requireCustomerAccount(req);
  if (!customer.isOwner) {
    throw fail("Website owner access is required.", 403, "OWNER_REQUIRED");
  }
  return customer;
}

export async function getDiscordGuildPermissions(token) {
  if (!token) {
    throw fail("Connect your Discord account before managing servers.", 401, "DISCORD_NOT_LINKED");
  }
  const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 401) {
    throw fail("Your Discord connection expired. Reconnect Discord.", 401, "DISCORD_SESSION_EXPIRED");
  }
  if (!response.ok) {
    throw fail("Discord could not verify your server permissions.", 502, "DISCORD_LOOKUP_FAILED");
  }
  const guilds = await response.json();
  return (Array.isArray(guilds) ? guilds : []).map((guild) => {
    let permissions = 0n;
    try { permissions = BigInt(guild.permissions || "0"); } catch {}
    const administrator = (permissions & ADMIN) === ADMIN;
    const manager = (permissions & MANAGE_GUILD) === MANAGE_GUILD;
    const owner = guild.owner === true;
    return {
      id: String(guild.id),
      name: String(guild.name || "Discord server"),
      icon: guild.icon || null,
      owner,
      administrator,
      manager,
      canManage: owner || administrator || manager,
      accessLevel: owner ? "owner" : administrator ? "administrator" : manager ? "manager" : null,
    };
  });
}

export async function requireManagedGuild(req, guildId) {
  const customer = await requireCustomerAccount(req);
  if (customer.isOwner) return { ...customer, guild: { id: String(guildId), accessLevel: "website_owner" } };

  const id = String(guildId || "").trim();
  if (!/^\d{15,22}$/.test(id)) {
    throw fail("A valid Discord server ID is required.", 400, "INVALID_GUILD_ID");
  }

  const stored = await query(
    "SELECT guild_id, guild_name FROM customer_servers WHERE account_id = $1 AND guild_id = $2",
    [customer.account.id, id]
  );
  if (!stored.rows[0]) {
    throw fail("This server is not connected to your account.", 403, "SERVER_NOT_LINKED");
  }

  const guilds = await getDiscordGuildPermissions(customer.session.discordToken);
  const live = guilds.find((guild) => guild.id === id);
  if (!live?.canManage) {
    throw fail("Your Discord account no longer has permission to manage this server.", 403, "SERVER_PERMISSION_REVOKED");
  }

  await query(
    `UPDATE customer_servers
     SET guild_name = $3, access_level = $4, verified_at = NOW(), updated_at = NOW()
     WHERE account_id = $1 AND guild_id = $2`,
    [customer.account.id, id, live.name, live.accessLevel]
  );

  return { ...customer, guild: live };
}
