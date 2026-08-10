export default async function handler(req, res) {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send(
            "No Discord authorization code was provided."
        );
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        console.error("Missing Discord OAuth environment variables.");

        return res.status(500).send(
            "Discord OAuth environment variables are missing."
        );
    }

    try {
        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirectUri
        });

        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: body.toString()
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error(
                "Discord token exchange failed:",
                tokenData
            );

            return res.status(500).send(
                "Discord authorization failed."
            );
        }

        if (!tokenData.access_token) {
            return res.status(500).send(
                "Discord did not return an access token."
            );
        }

        /*
         * Save Discord OAuth token in an HttpOnly cookie.
         *
         * SameSite=Lax allows the cookie to survive
         * the normal Discord -> Vercel OAuth redirect.
         */

        const cookie = [
            `discord_access_token=${encodeURIComponent(
                tokenData.access_token
            )}`,
            "Path=/",
            "HttpOnly",
            "Secure",
            "SameSite=Lax",
            `Max-Age=${tokenData.expires_in || 604800}`
        ].join("; ");

        res.setHeader(
            "Set-Cookie",
            cookie
        );

        /*
         * Redirect directly to the dashboard.
         */

        res.writeHead(302, {
            Location: "/"
        });

        res.end();

    } catch (error) {

        console.error(
            "OAuth callback error:",
            error
        );

        return res.status(500).send(
            "Something went wrong during Discord login."
        );
    }
}