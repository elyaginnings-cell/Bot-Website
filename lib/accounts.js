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
    `INSERT INTO accounts (email, password_hash, username, global_name) VALUES ($1, $2, $3, $3) RETURNING id, email, discord_id, username, global_name, avatar`,
    [normalizeEmail(email), hash, username || normalizeEmail(email).split("@")[0]]
  );
  return result.rows[0];
}
export async function findByEmail(email) {
  const result = await query(
    `SELECT id, email, password_hash, discord_id, username, global_name, avatar FROM accounts WHERE email = $1`,
    [normalizeEmail(email)]
  );
  return result.rows[0] || null;
}
export async function verifyPassword(account, password) {
  if (!account?.password_hash) return false;
  return bcrypt.compare(password, account.password_hash);
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
  };
}
