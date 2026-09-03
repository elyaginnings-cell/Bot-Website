export default function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).send("Discord OAuth is not configured.");
  }

  const state = req.query?.state === "link" ? "link" : "login";

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "identify email guilds",
    state,
  });

  return res.redirect(
    302,
    `https://discord.com/oauth2/authorize?${params.toString()}`
  );
}
