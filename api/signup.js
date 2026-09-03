import {
  createAccount,
  findByEmail,
  publicUser,
  validateCredentials,
} from "../lib/accounts.js";
import { setSessionCookies } from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "Database is not configured (DATABASE_URL)." });
    }
    if (!process.env.SESSION_SECRET) {
      return res.status(500).json({ error: "Missing SESSION_SECRET" });
    }

    const { email, password } = req.body || {};
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
    if (String(error.message || "").includes("duplicate")) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }
    return res.status(500).json({ error: "Could not create account." });
  }
}
