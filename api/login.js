import { clearSessionCookies } from "../lib/session.js";

function isLogoutRequest(req) {
  const url = String(req.url || "");
  const action = String(req.query?.action || "");
  return action === "logout" || url.includes("/logout") || url.includes("action=logout");
}

export default function handler(req, res) {
  if (isLogoutRequest(req)) {
    clearSessionCookies(res);
    return res.redirect(302, "/");
  }

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
