export default async function handler(req, res) {

    const code = req.query.code;

    if (!code) {
        return res.status(400).send(
            "Missing Discord authorization code."
        );
    }

    const params = new URLSearchParams();

    params.append(
        "client_id",
        process.env.DISCORD_CLIENT_ID
    );

    params.append(
        "client_secret",
        process.env.DISCORD_CLIENT_SECRET
    );

    params.append(
        "grant_type",
        "authorization_code"
    );

    params.append(
        "code",
        code
    );

    params.append(
        "redirect_uri",
        process.env.DISCORD_REDIRECT_URI
    );


    const tokenResponse =
        await fetch(
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

        const error =
            await tokenResponse.text();

        console.error(error);

        return res.status(500).send(
            "Discord authentication failed."
        );
    }


    const tokens =
        await tokenResponse.json();


    /*
     * Store the OAuth token in a secure,
     * HTTP-only cookie.
     */

    const cookie =
        `discord_access_token=${tokens.access_token}; ` +
        `HttpOnly; ` +
        `Secure; ` +
        `SameSite=Lax; ` +
        `Path=/; ` +
        `Max-Age=${tokens.expires_in}`;


    res.setHeader(
        "Set-Cookie",
        cookie
    );


    res.redirect("/");
}