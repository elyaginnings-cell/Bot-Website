import crypto from "crypto";

function cookie(value, maxAge) {
  const flags = [
    `oauth_state=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];

  if (process.env.NODE_ENV === "production") flags.push("Secure");
  return flags.join("; ");
}

export default function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).send("Discord OAuth is not configured.");
  }

  const state = crypto.randomBytes(32).toString("base64url");

  res.setHeader("Set-Cookie", cookie(state, 600));

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "identify guilds",
    state,
  });

  return res.redirect(
    302,
    `https://discord.com/oauth2/authorize?${params.toString()}`
  );
}