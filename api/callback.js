import { encrypt, getCookie, sessionCookie } from "./session.js";

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send("Missing authorization code.");
  }

  const expectedState = getCookie(req, "oauth_state");
  if (!state || !expectedState || state !== expectedState) {
    return res.status(400).send("Invalid OAuth state.");
  }

  const required = [
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "DISCORD_REDIRECT_URI",
    "SESSION_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    return res.status(500).send(`Missing environment variables: ${missing.join(", ")}`);
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Discord token exchange failed:", await tokenResponse.text());
      return res.status(401).send("Discord authentication failed.");
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return res.status(401).send("Discord did not return an access token.");
    }

    const encryptedToken = encrypt(
      tokenData.access_token,
      process.env.SESSION_SECRET
    );

    res.setHeader("Set-Cookie", [
      sessionCookie(encryptedToken),
      "oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" +
        (process.env.NODE_ENV === "production" ? "; Secure" : ""),
    ]);

    return res.redirect(302, "/");
  } catch (error) {
    console.error("Callback error:", error);
    return res.status(500).send("Internal server error.");
  }
}