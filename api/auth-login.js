import {
  createAccount,
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

function readBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return {};
}

function isSignupRequest(req) {
  const url = String(req.url || "");
  const action = String(req.query?.action || "");
  return action === "signup" || url.includes("/signup") || url.includes("action=signup");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const signup = isSignupRequest(req);

  try {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_PUBLIC_URL && !process.env.POSTGRES_URL) {
      return res.status(500).json({
        error: signup
          ? "Database is not configured. Add DATABASE_URL in Vercel."
          : "Database is not configured (DATABASE_URL).",
      });
    }

    if (!process.env.SESSION_SECRET) {
      return res.status(500).json({ error: "Missing SESSION_SECRET" });
    }

    requireStaffConfiguration();

    const { email, password } = readBody(req);

    const invalid = validateCredentials(email, password);
    if (invalid) {
      return res.status(400).json({ error: invalid });
    }

    if (signup) {
      if (!isStaffEmail(email)) {
        return res.status(403).json({
          error: "That email is not authorized to create a dashboard account.",
        });
      }

      const existing = await findByEmail(email);

      if (existing) {
        return res.status(409).json({
          error: "An account with that email already exists.",
        });
      }

      const account = await createAccount({ email, password });

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
    }

    const account = await findByEmail(email);

    if (!account || !account.password_hash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const ok = await verifyPassword(account, password);

    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const staff =
      isStaffEmail(account.email) || isStaffDiscordId(account.discord_id);

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
    console.error(signup ? "Signup error:" : "Password login error:", error);

    return res.status(error.status || 500).json({
      error: error.message || (signup ? "Could not create account." : "Could not log in."),
    });
  }
}
