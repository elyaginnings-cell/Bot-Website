export default function handler(req, res) {
    const clientId = process.env.DISCORD_CLIENT_ID;

    const redirectUri =
        process.env.DISCORD_REDIRECT_URI;

    const scopes = [
        "identify",
        "guilds"
    ].join("%20");

    const url =
        `https://discord.com/oauth2/authorize` +
        `?client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${scopes}`;

    res.redirect(302, url);
}