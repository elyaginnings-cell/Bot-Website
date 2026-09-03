import {
  linkDiscordToAccount,
  upsertDiscordAccount,
} from "../lib/accounts.js";
import { readSession, setSessionCookies } from "../lib/session.js";

export default async function handler(req, res) {
  const {
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_REDIRECT_URI,
    SESSION_SECRET,
  } = process.env;

  if (
    !DISCORD_CLIENT_ID ||
    !DISCORD_CLIENT_SECRET ||
    !DISCORD_REDIRECT_URI ||
    !SESSION_SECRET
  ) {
    return res.status(500).send("Discord OAuth is not configured correctly.");
  }

  const code = req.query?.code;
  const state = req.query?.state || "";
  const isLink = state === "link";

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
      const errorText = await tokenResponse.text();
      console.error("Discord token error:", errorText);
      return res.status(401).send("Discord authentication failed.");
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return res.status(401).send("Discord did not return an access token.");
    }

    const accessToken = tokenData.access_token;

    const meResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meResponse.ok) {
      return res.status(401).send("Could not fetch Discord user.");
    }

    const discordUser = await meResponse.json();

    let account = null;

    // If user is already logged in with email and clicked "Link Discord"
    if (isLink) {
      try {
        const existingSession = readSession(req);
        if (existingSession?.accountId) {
          account = await linkDiscordToAccount(
            existingSession.accountId,
            discordUser
          );
        }
      } catch (err) {
        if (err.code === "DISCORD_TAKEN") {
          return res
            .status(409)
            .send(
              "That Discord account is already linked to a different login. Log out and use Discord login instead."
            );
        }
        console.error("Link Discord error:", err);
      }
    }

    if (!account) {
      account = await upsertDiscordAccount(discordUser);
    }

    setSessionCookies(
      res,
      {
        v: 1,
        accountId: account.id,
        method: "discord",
        discordId: account.discord_id || discordUser.id,
      },
      accessToken
    );

    return res.redirect(302, "/");
  } catch (error) {
    console.error("Callback error:", error);
    return res.status(500).send("Internal server error.");
  }
}
