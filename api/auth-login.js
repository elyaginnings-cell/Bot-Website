import {
  findByEmail,
  publicUser,
  validateCredentials,
  verifyPassword,
} from "../lib/accounts.js";
import { setSessionCookies } from "../lib/session.js";
import {
  isStaffEmail,
  isStaffDiscordId,
  requireStaffConfiguration,
} from "../lib/staffAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res
        .status(500)
        .json({ error: "Database is not configured (DATABASE_URL)." });
    }

    if (!process.env.SESSION_SECRET) {
      return res.status(500).json({ error: "Missing SESSION_SECRET" });
    }

    requireStaffConfiguration();

    const { email, password } = req.body || {};

    const invalid = validateCredentials(email, password);
    if (invalid) {
      return res.status(400).json({ error: invalid });
    }

    const account = await findByEmail(email);

    if (!account || !account.password_hash) {
      return res
        .status(401)
        .json({ error: "Invalid email or password." });
    }

    const ok = await verifyPassword(account, password);

    if (!ok) {
      return res
        .status(401)
        .json({ error: "Invalid email or password." });
    }

    /*
     * Email login is only allowed for configured high-staff emails.
     *
     * We intentionally DO NOT redirect to Discord OAuth here.
     */
    const staff =
      isStaffEmail(account.email) ||
      isStaffDiscordId(account.discord_id);

    if (!staff) {
      return res.status(403).json({
        error: "This account is not authorized to access the dashboard.",
      });
    }

    setSessionCookies(res, {
      v: 1,
      accountId: account.id,
      method: "password",
      discordId: account.discord_id || null,
      staff: true,
    });

    return res.status(200).json({
      ok: true,
      user: publicUser(account),
    });
  } catch (error) {
    console.error("Password login error:", error);

    return res.status(error.status || 500).json({
      error: error.message || "Could not log in.",
    });
  }
}