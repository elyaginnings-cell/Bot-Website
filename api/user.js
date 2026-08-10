import { decrypt, getCookie, clearSessionCookie } from "./session.js";

export default async function handler(req, res) {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      return res.status(500).json({
        authenticated: false,
        error: "Missing SESSION_SECRET",
      });
    }

    const session = getCookie(req, "discord_session");
    if (!session) {
      return res.status(401).json({ authenticated: false });
    }

    let token;
    try {
      token = decrypt(session, secret);
    } catch {
      res.setHeader("Set-Cookie", clearSessionCookie());
      return res.status(401).json({ authenticated: false });
    }

    const response = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      res.setHeader("Set-Cookie", clearSessionCookie());
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
      },
    });
  } catch (error) {
    console.error("User API error:", error);
    return res.status(500).json({ authenticated: false });
  }
}