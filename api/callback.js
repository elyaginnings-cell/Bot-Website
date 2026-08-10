export default async function handler(req, res) {
    const code = req.query.code;

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;

    const page = (title, message, details = "") => `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <title>${title}</title>

            <style>
                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    min-height: 100vh;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    background: #0b0d12;
                    color: #f2f3f5;

                    font-family:
                        Inter,
                        system-ui,
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;

                    padding: 20px;
                }

                .box {
                    width: 100%;
                    max-width: 650px;

                    background: #151922;

                    border: 1px solid #272c38;

                    border-radius: 16px;

                    padding: 30px;

                    box-shadow:
                        0 20px 60px
                        rgba(0, 0, 0, .4);
                }

                h1 {
                    margin-top: 0;
                    font-size: 25px;
                }

                p {
                    color: #9aa1ae;
                    line-height: 1.6;
                }

                .details {
                    margin-top: 20px;

                    background: #0b0d12;

                    border: 1px solid #272c38;

                    border-radius: 10px;

                    padding: 16px;

                    font-family: monospace;

                    font-size: 13px;

                    line-height: 1.8;

                    white-space: pre-wrap;

                    overflow-wrap: anywhere;
                }

                .success {
                    color: #23c483;
                }

                .error {
                    color: #ff6b6b;
                }

                .warning {
                    color: #f5c451;
                }

                button {
                    margin-top: 20px;

                    border: 0;

                    background: #5865f2;

                    color: white;

                    padding: 12px 18px;

                    border-radius: 8px;

                    font-weight: 600;

                    cursor: pointer;
                }

                button:hover {
                    background: #4752c4;
                }
            </style>
        </head>

        <body>

            <div class="box">

                ${message}

                ${details
                    ? `<div class="details">${details}</div>`
                    : ""
                }

                <button onclick="location.href='/'">
                    Return to Dashboard
                </button>

            </div>

        </body>
        </html>
    `;


    if (!code) {

        return res.status(400).send(
            page(
                "Discord Login Error",
                `
                    <h1 class="error">
                        ❌ No Discord authorization code
                    </h1>

                    <p>
                        Discord did not send an authorization
                        code to the website.
                    </p>
                `
            )
        );
    }


    if (
        !clientId ||
        !clientSecret ||
        !redirectUri
    ) {

        return res.status(500).send(
            page(
                "Configuration Error",
                `
                    <h1 class="error">
                        ❌ OAuth Configuration Error
                    </h1>

                    <p>
                        One or more Discord environment
                        variables are missing from Vercel.
                    </p>
                `,
                `Client ID: ${!!clientId}
Client Secret: ${!!clientSecret}
Redirect URI: ${redirectUri || "MISSING"}`
            )
        );
    }


    try {

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


        if (!tokenResponse.ok) {

            return res.status(500).send(
                page(
                    "Discord OAuth Error",
                    `
                        <h1 class="error">
                            ❌ Discord rejected the login
                        </h1>

                        <p>
                            Discord received the request,
                            but refused to exchange the
                            authorization code.
                        </p>
                    `,
                    `HTTP Status: ${tokenResponse.status}

Error: ${tokenData.error || "Unknown"}

Description: ${
    tokenData.error_description ||
    "No description provided"
}`
                )
            );
        }


        if (!tokenData.access_token) {

            return res.status(500).send(
                page(
                    "Token Error",
                    `
                        <h1 class="error">
                            ❌ No access token received
                        </h1>

                        <p>
                            Discord accepted the login,
                            but did not return an access token.
                        </p>
                    `
                )
            );
        }


        /*
         * IMPORTANT:
         *
         * We NEVER display the actual Discord token.
         */

        const cookie =
            [
                `discord_access_token=${encodeURIComponent(
                    tokenData.access_token
                )}`,

                "Path=/",

                "HttpOnly",

                "Secure",

                "SameSite=Lax",

                `Max-Age=${
                    tokenData.expires_in ||
                    604800
                }`
            ].join("; ");


        res.setHeader(
            "Set-Cookie",
            cookie
        );


        res.setHeader(
            "Cache-Control",
            "no-store"
        );


        /*
         * Instead of immediately redirecting,
         * let the browser test the session.
         */

        return res.status(200).send(
            page(
                "Login Successful",
                `
                    <h1 class="success">
                        ✅ Discord Login Successful!
                    </h1>

                    <p>
                        Discord authentication worked
                        and the website created your
                        authentication cookie.
                    </p>

                    <p>
                        Click below to test whether the
                        dashboard can read that cookie.
                    </p>
                `,
                `OAuth Code: RECEIVED

Discord Token: RECEIVED

Authentication Cookie: CREATED

Cookie Type: HttpOnly + Secure + SameSite=Lax`
            )
        );


    } catch (error) {

        console.error(
            "OAuth callback error:",
            error
        );


        return res.status(500).send(
            page(
                "Server Error",
                `
                    <h1 class="error">
                        ❌ Website OAuth Error
                    </h1>

                    <p>
                        Something crashed while processing
                        the Discord login.
                    </p>
                `,
                `Error: ${error.message}`
            )
        );
    }
}