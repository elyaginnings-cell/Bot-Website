import { upsertDiscordAccount } from "../lib/accounts.js";
import { setSessionCookies } from "../lib/session.js";

export default async function handler(req, res) {
  const {
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_REDIRECT_URI,
    SESSION_SECRET,
  } = process.env;

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI || !SESSION_SECRET) {
    return res.status(500).send("Discord OAuth is not configured correctly.");
  }

  const code = req.query?.code;
  if (!code) {
    return res.status(400).send("Missing authorization code.");
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Discord token error:", await tokenResponse.text());
      return res.status(401).send("Discord authentication failed.");
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return res.status(401).send("Discord did not return an access token.");
    }

    const meResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!meResponse.ok) {
      return res.status(401).send("Could not load Discord profile.");
    }

    const me = await meResponse.json();
    let account = {
      id: null,
      discord_id: me.id,
      email: me.email || null,
      username: me.username,
      global_name: me.global_name,
      avatar: me.avatar,
    };

    if (process.env.DATABASE_URL) {
      account = await upsertDiscordAccount({
        discordId: me.id,
        email: me.email || null,
        username: me.username,
        globalName: me.global_name,
        avatar: me.avatar,
      });
    }

    setSessionCookies(
      res,
      {
        v: 1,
        accountId: account.id,
        method: "discord",
        discordId: me.id,
        discordToken: tokenData.access_token,
      },
      tokenData.access_token
    );

    return res.redirect(302, "/");
  } catch (error) {
    console.error("Callback error:", error);
    return res.status(500).send("Internal server error.");
  }
}
