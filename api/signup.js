import {
  createAccount,
  findByEmail,
  publicUser,
  validateCredentials,
} from "../lib/accounts.js";
import { setSessionCookies } from "../lib/session.js";

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "Database is not configured. Add DATABASE_URL in Vercel." });
    }
    if (!process.env.SESSION_SECRET) {
      return res.status(500).json({ error: "Missing SESSION_SECRET" });
    }
    const { email, password } = readBody(req);
    const invalid = validateCredentials(email, password);
    if (invalid) return res.status(400).json({ error: invalid });
    const existing = await findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }
    const account = await createAccount({ email, password });
    setSessionCookies(res, {
      v: 1,
      accountId: account.id,
      method: "password",
      discordId: account.discord_id || null,
      discordToken: null,
    });
    return res.status(200).json({ ok: true, user: publicUser(account) });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: error.message || "Could not create account." });
  }
}
