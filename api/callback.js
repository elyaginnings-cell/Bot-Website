export default async function handler(req, res) {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send("Missing Discord authorization code.");
    }

    try {
        const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: process.env.DISCORD_REDIRECT_URI
        });

        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: params
            }
        );

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();

            console.error(
                "Discord token error:",
                error
            );

            return res.status(500).send(
                "Discord token exchange failed."
            );
        }

        const tokens = await tokenResponse.json();

        /*
         * Store the Discord access token
         * in an HTTP-only cookie.
         */

        res.setHeader(
            "Set-Cookie",
            `discord_access_token=${encodeURIComponent(
                tokens.access_token
            )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${tokens.expires_in}`
        );

        /*
         * Send the user back to the website.
         */

        return res.redirect(
            302,
            "/"
        );

    } catch (error) {

        console.error(
            "OAuth callback error:",
            error
        );

        return res.status(500).send(
            "Authentication failed."
        );
    }
}