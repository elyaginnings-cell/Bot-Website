import bcrypt from "bcryptjs";
import { query } from "./db.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function validateCredentials(email, password) {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized)) return "Enter a valid email address.";
  if (!password || String(password).length < 8) return "Password must be at least 8 characters.";
  if (String(password).length > 72) return "Password is too long.";
  return null;
}

export async function createAccount({ email, password, username }) {
  const hash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO accounts (email, password_hash, username, global_name)
     VALUES ($1, $2, $3, $3)
     RETURNING id, email, discord_id, username, global_name, avatar`,
    [normalizeEmail(email), hash, username || normalizeEmail(email).split("@")[0]]
  );
  return result.rows[0];
}

export async function findByEmail(email) {
  const result = await query(
    `SELECT id, email, password_hash, discord_id, username, global_name, avatar
     FROM accounts WHERE email = $1`,
    [normalizeEmail(email)]
  );
  return result.rows[0] || null;
}

export async function findById(id) {
  const result = await query(
    `SELECT id, email, password_hash, discord_id, username, global_name, avatar
     FROM accounts WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function findByDiscordId(discordId) {
  if (!discordId) return null;
  const result = await query(
    `SELECT id, email, password_hash, discord_id, username, global_name, avatar
     FROM accounts WHERE discord_id = $1`,
    [String(discordId)]
  );
  return result.rows[0] || null;
}

export async function verifyPassword(account, password) {
  if (!account?.password_hash) return false;
  return bcrypt.compare(password, account.password_hash);
}

/** Create or update an account from Discord OAuth user data. */
export async function upsertDiscordAccount(discordUser) {
  const discordId = String(discordUser.id);
  const username = discordUser.username || "Discord User";
  const globalName = discordUser.global_name || username;
  const avatar = discordUser.avatar || null;
  const email = discordUser.email ? normalizeEmail(discordUser.email) : null;

  const existing = await findByDiscordId(discordId);
  if (existing) {
    const result = await query(
      `UPDATE accounts
       SET username = $2,
           global_name = $3,
           avatar = $4,
           email = COALESCE(email, $5),
           updated_at = NOW()
       WHERE discord_id = $1
       RETURNING id, email, discord_id, username, global_name, avatar`,
      [discordId, username, globalName, avatar, email]
    );
    return result.rows[0];
  }

  // If Discord gave us an email that already has an account, link it
  if (email) {
    const byEmail = await findByEmail(email);
    if (byEmail && !byEmail.discord_id) {
      const result = await query(
        `UPDATE accounts
         SET discord_id = $2,
             username = COALESCE(username, $3),
             global_name = COALESCE(global_name, $4),
             avatar = COALESCE(avatar, $5),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, discord_id, username, global_name, avatar`,
        [byEmail.id, discordId, username, globalName, avatar]
      );
      return result.rows[0];
    }
  }

  const result = await query(
    `INSERT INTO accounts (discord_id, email, username, global_name, avatar)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, discord_id, username, global_name, avatar`,
    [discordId, email, username, globalName, avatar]
  );
  return result.rows[0];
}

/** Attach a Discord identity to an existing email account (link flow). */
export async function linkDiscordToAccount(accountId, discordUser) {
  const discordId = String(discordUser.id);
  const username = discordUser.username || null;
  const globalName = discordUser.global_name || username;
  const avatar = discordUser.avatar || null;

  const taken = await findByDiscordId(discordId);
  if (taken && taken.id !== accountId) {
    const err = new Error("That Discord account is already linked to a different login.");
    err.code = "DISCORD_TAKEN";
    throw err;
  }

  const result = await query(
    `UPDATE accounts
     SET discord_id = $2,
         username = COALESCE($3, username),
         global_name = COALESCE($4, global_name),
         avatar = COALESCE($5, avatar),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, discord_id, username, global_name, avatar`,
    [accountId, discordId, username, globalName, avatar]
  );
  return result.rows[0];
}

export function publicUser(account) {
  return {
    id: account.discord_id || account.id,
    accountId: account.id,
    email: account.email || null,
    username: account.username || (account.email ? account.email.split("@")[0] : "User"),
    global_name: account.global_name || account.username || null,
    avatar: account.avatar || null,
    discord_id: account.discord_id || null,
    linked: Boolean(account.discord_id),
  };
}
