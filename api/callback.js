export default async function handler(req, res) {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send("Missing authorization code.");
    }

    try {
        const params = new URLSearchParams();

        params.set(
            "client_id",
            process.env.DISCORD_CLIENT_ID
        );

        params.set(
            "client_secret",
            process.env.DISCORD_CLIENT_SECRET
        );

        params.set(
            "grant_type",
            "authorization_code"
        );

        params.set(
            "code",
            code
        );

        params.set(
            "redirect_uri",
            process.env.DISCORD_REDIRECT_URI
        );

        const response = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body: params.toString()
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                "Discord token exchange failed:",
                data
            );

            return res.status(500).send(
                "Discord authentication failed."
            );
        }

        if (!data.access_token) {
            return res.status(500).send(
                "Discord did not provide an access token."
            );
        }

        /*
         * Save the token in a secure HTTP-only cookie.
         */

        const cookie = [
            `discord_access_token=${encodeURIComponent(
                data.access_token
            )}`,
            "Path=/",
            "HttpOnly",
            "Secure",
            "SameSite=Lax",
            `Max-Age=${data.expires_in || 604800}`
        ].join("; ");

        res.setHeader(
            "Set-Cookie",
            cookie
        );

        /*
         * Send them back to the dashboard.
         */

        res.writeHead(
            302,
            {
                Location: "/"
            }
        );

        res.end();

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