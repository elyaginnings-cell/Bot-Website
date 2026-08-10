export default async function handler(
    req,
    res
) {

    const code =
        req.query.code;


    if (!code) {

        return res.status(400).send(
            "No Discord authorization code was provided."
        );
    }


    const clientId =
        process.env.DISCORD_CLIENT_ID;

    const clientSecret =
        process.env.DISCORD_CLIENT_SECRET;

    const redirectUri =
        process.env.DISCORD_REDIRECT_URI;


    if (
        !clientId ||
        !clientSecret ||
        !redirectUri
    ) {

        return res.status(500).send(
            "Discord OAuth environment variables are missing."
        );
    }


    try {

        /*
         * Exchange authorization code
         * for Discord access token.
         */

        const body =
            new URLSearchParams({

                client_id:
                    clientId,

                client_secret:
                    clientSecret,

                grant_type:
                    "authorization_code",

                code:
                    code,

                redirect_uri:
                    redirectUri

            });


        const tokenResponse =
            await fetch(
                "https://discord.com/api/oauth2/token",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/x-www-form-urlencoded"

                    },

                    body:
                        body.toString()

                }
            );


        const tokenData =
            await tokenResponse.json();


        console.log(
            "Discord OAuth token response:",
            tokenResponse.status
        );


        if (
            !tokenResponse.ok ||
            !tokenData.access_token
        ) {

            console.error(
                "Discord OAuth failed:",
                tokenData
            );


            return res.status(500).send(
                "Discord authorization failed."
            );
        }


        /*
         * Store the token in a secure cookie.
         *
         * JavaScript cannot read this cookie.
         */

        const cookie = [
            "discord_access_token=" +
                encodeURIComponent(
                    tokenData.access_token
                ),

            "Path=/",

            "HttpOnly",

            "Secure",

            "SameSite=Lax",

            `Max-Age=${
                tokenData.expires_in || 604800
            }`
        ].join("; ");


        res.setHeader(
            "Set-Cookie",
            cookie
        );


        /*
         * IMPORTANT:
         *
         * We return to the dashboard.
         *
         * There is NO login page.
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
            "Something went wrong during Discord login."
        );
    }
}