import crypto from "crypto";

function encrypt(text, secret) {
    const iv = crypto.randomBytes(16);

    const key = crypto
        .createHash("sha256")
        .update(secret)
        .digest();

    const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        key,
        iv
    );

    let encrypted = cipher.update(
        text,
        "utf8",
        "hex"
    );

    encrypted += cipher.final("hex");

    return `${iv.toString("hex")}.${encrypted}`;
}

export default async function handler(req, res) {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send(`
            <h1>❌ Login Failed</h1>
            <p>Discord didn't provide an authorization code.</p>
        `);
    }

    const clientId =
        process.env.DISCORD_CLIENT_ID;

    const clientSecret =
        process.env.DISCORD_CLIENT_SECRET;

    const redirectUri =
        process.env.DISCORD_REDIRECT_URI;

    const sessionSecret =
        process.env.SESSION_SECRET;

    if (
        !clientId ||
        !clientSecret ||
        !redirectUri ||
        !sessionSecret
    ) {
        return res.status(500).send(`
            <h1>❌ Configuration Error</h1>
            <p>
                One or more environment variables are missing.
            </p>
        `);
    }

    try {
        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
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

        const tokenData =
            await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error(tokenData);

            return res.status(500).send(`
                <h1>❌ Discord Login Failed</h1>
                <p>Discord rejected the authorization.</p>
            `);
        }

        if (!tokenData.access_token) {
            return res.status(500).send(`
                <h1>❌ No Access Token</h1>
                <p>
                    Discord didn't return an access token.
                </p>
            `);
        }

        /*
         * Encrypt the Discord token before putting
         * anything into the browser cookie.
         */

        const session = encrypt(
            tokenData.access_token,
            sessionSecret
        );

        /*
         * SameSite=None makes the OAuth redirect
         * work reliably across browsers.
         *
         * Secure means HTTPS only.
         *
         * HttpOnly prevents frontend JavaScript
         * from reading the cookie.
         */

        const cookie = [
            `discord_session=${encodeURIComponent(session)}`,
            "Path=/",
            "HttpOnly",
            "Secure",
            "SameSite=None",
            `Max-Age=${tokenData.expires_in || 604800}`
        ].join("; ");

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

                <meta
                    charset="UTF-8"
                >

                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                >

                <title>Login Successful</title>

                <style>

                    body {
                        margin: 0;
                        min-height: 100vh;

                        display: flex;
                        align-items: center;
                        justify-content: center;

                        background: #0b0d12;
                        color: white;

                        font-family:
                            system-ui,
                            sans-serif;
                    }

                    .box {
                        text-align: center;
                        padding: 40px;

                        background: #151922;

                        border-radius: 18px;

                        max-width: 500px;

                        width: calc(100% - 40px);
                    }

                    h1 {
                        color: #23c483;
                    }

                    p {
                        color: #aeb4c0;
                    }

                </style>

            </head>

            <body>

                <div class="box">

                    <h1>
                        ✅ Login Successful!
                    </h1>

                    <p>
                        Your Discord session has been saved.
                    </p>

                    <p>
                        Redirecting to your dashboard...
                    </p>

                </div>

                <script>

                    setTimeout(() => {
                        window.location.href = "/";
                    }, 1200);

                </script>

            </body>

            </html>
        `);

    } catch (error) {

        console.error(error);

        return res.status(500).send(`
            <h1>❌ Server Error</h1>
            <p>
                Something went wrong while logging in.
            </p>
        `);
    }
}