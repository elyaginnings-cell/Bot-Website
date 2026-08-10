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

    let encrypted =
        cipher.update(text, "utf8", "hex");

    encrypted += cipher.final("hex");

    return `${iv.toString("hex")}.${encrypted}`;
}

export default async function handler(req, res) {

    const {
        DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET,
        DISCORD_REDIRECT_URI,
        SESSION_SECRET
    } = process.env;


    if (
        !DISCORD_CLIENT_ID ||
        !DISCORD_CLIENT_SECRET ||
        !DISCORD_REDIRECT_URI ||
        !SESSION_SECRET
    ) {
        return res.status(500).send(
            "Discord OAuth is not configured correctly."
        );
    }


    const code = req.query?.code;

    if (!code) {
        return res.status(400).send(
            "Missing authorization code."
        );
    }


    try {

        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body: new URLSearchParams({
                    client_id: DISCORD_CLIENT_ID,
                    client_secret: DISCORD_CLIENT_SECRET,
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: DISCORD_REDIRECT_URI
                })
            }
        );


        if (!tokenResponse.ok) {

            const errorText =
                await tokenResponse.text();

            console.error(
                "Discord token error:",
                errorText
            );

            return res.status(401).send(
                "Discord authentication failed."
            );
        }


        const tokenData =
            await tokenResponse.json();


        if (!tokenData.access_token) {
            return res.status(401).send(
                "Discord did not return an access token."
            );
        }


        const encryptedToken =
            encrypt(
                tokenData.access_token,
                SESSION_SECRET
            );


        const cookieFlags = [
            `discord_session=${encodeURIComponent(encryptedToken)}`,
            "Path=/",
            "HttpOnly",
            "SameSite=Lax",
            "Max-Age=604800"
        ];


        if (process.env.NODE_ENV === "production") {
            cookieFlags.push("Secure");
        }


        res.setHeader(
            "Set-Cookie",
            cookieFlags.join("; ")
        );


        return res.redirect(302, "/");

    } catch (error) {

        console.error(
            "Callback error:",
            error
        );

        return res.status(500).send(
            "Internal server error."
        );
    }
}