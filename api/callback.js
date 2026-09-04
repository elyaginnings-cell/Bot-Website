import {
  linkDiscordToAccount,
  upsertDiscordAccount,
} from "../lib/accounts.js";
import { readSession, setSessionCookies } from "../lib/session.js";
import {
  isStaffDiscordId,
  isStaffEmail,
  requireStaffConfiguration,
} from "../lib/staffAuth.js";

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

  try {
    requireStaffConfiguration();
  } catch (error) {
    return res.status(error.status || 500).send(error.message);
  }

  const code = req.query?.code;
  const state = req.query?.state || "";
  const isLink = state === "link";

  if (!code) {
    return res.status(400).send("Missing authorization code.");
  }

  try {
    const tokenResponse = await fetch(
      "https://discord.com/api/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: DISCORD_REDIRECT_URI,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Discord token error:", errorText);

      return res.status(401).send("Discord authentication failed.");
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res
        .status(401)
        .send("Discord did not return an access token.");
    }

    const accessToken = tokenData.access_token;

    const meResponse = await fetch(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!meResponse.ok) {
      return res.status(401).send("Could not fetch Discord user.");
    }

    const discordUser = await meResponse.json();

    /*
     * Discord login is permitted if either:
     *
     * 1. The Discord ID is explicitly high staff, OR
     * 2. The Discord account's OAuth email is a configured staff email.
     */
    const discordIsStaff =
      isStaffDiscordId(discordUser.id) ||
      isStaffEmail(discordUser.email);

    /*
     * Linking happens after an already-authenticated email session.
     */
    let account = null;

    if (isLink) {
      try {
        const existingSession = readSession(req);

        if (existingSession?.accountId && existingSession.staff === true) {
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

    /*
     * If this wasn't a valid email-session link, require the
     * Discord identity itself to be high staff.
     */
    if (!account && !discordIsStaff) {
      return res.status(403).send(
        "This Discord account is not authorized to access the dashboard."
      );
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
        staff: true,
      },
      accessToken
    );

    return res.redirect(302, "/");
  } catch (error) {
    console.error("Callback error:", error);

    return res.status(500).send("Internal server error.");
  }
}