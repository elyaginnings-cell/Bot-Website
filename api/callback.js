export default async function handler(req, res) {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send("❌ No Discord code received.");
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;

    console.log("=== DISCORD CALLBACK ===");
    console.log("Client ID exists:", !!clientId);
    console.log("Client secret exists:", !!clientSecret);
    console.log("Redirect URI:", redirectUri);
    console.log("Code received:", !!code);

    try {
        const body = new URLSearchParams();

        body.append("client_id", clientId);
        body.append("client_secret", clientSecret);
        body.append("grant_type", "authorization_code");
        body.append("code", code);
        body.append("redirect_uri", redirectUri);

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

        console.log(
            "Discord token response:",
            tokenResponse.status
        );

        if (!tokenResponse.ok) {
            console.error(tokenData);

            return res.status(500).send(
                "❌ Discord rejected the OAuth request. Check Vercel logs."
            );
        }

        if (!tokenData.access_token) {
            return res.status(500).send(
                "❌ Discord did not give us an access token."
            );
        }

        console.log("✅ Access token received.");

        const cookie =
            `discord_access_token=${encodeURIComponent(
                tokenData.access_token
            )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${
                tokenData.expires_in || 604800
            }`;

        console.log("✅ Creating authentication cookie.");

        res.setHeader(
            "Set-Cookie",
            cookie
        );

        res.setHeader(
            "Cache-Control",
            "no-store"
        );

        res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Login Successful</title>
                <meta
                    http-equiv="refresh"
                    content="2;url=/"
                >
            </head>

            <body style="
                background:#0b0d12;
                color:white;
                font-family:Arial;
                display:flex;
                align-items:center;
                justify-content:center;
                height:100vh;
                text-align:center;
            ">

                <div>
                    <h1>✅ Login Successful!</h1>

                    <p>
                        Authentication cookie created.
                    </p>

                    <p>
                        Sending you to the dashboard...
                    </p>
                </div>

            </body>
            </html>
        `);

    } catch (error) {

        console.error(
            "OAuth callback error:",
            error
        );

        return res.status(500).send(
            "❌ OAuth callback crashed. Check Vercel logs."
        );
    }
}