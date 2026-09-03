import { query } from "../lib/db.js";
import { publicUser } from "../lib/accounts.js";
import { clearSessionCookies, readSession } from "../lib/session.js";

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

    if (!session) {
      return res.status(401).json({ authenticated: false });
    }

    if (session.accountId && process.env.DATABASE_URL) {
      const result = await query(
        `SELECT id, email, discord_id, username, global_name, avatar FROM accounts WHERE id = $1`,
        [session.accountId]
      );
      if (result.rows[0]) {
        return res.status(200).json({ authenticated: true, user: publicUser(result.rows[0]) });
      }
    }

    if (session.discordToken) {
      const response = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${session.discordToken}` },
      });
      if (!response.ok) {
        clearSessionCookies(res);
        return res.status(401).json({ authenticated: false });
      }
      const data = await response.json();
      return res.status(200).json({
        authenticated: true,
        user: {
          id: data.id,
          username: data.username,
          global_name: data.global_name,
          avatar: data.avatar,
          discord_id: data.id,
          email: data.email || null,
        },
      });
    }

    return res.status(401).json({ authenticated: false });
  } catch (error) {
    console.error("User API error:", error);
    return res.status(500).json({ authenticated: false });
  }
}
