const crypto = require("crypto");

function parseCookies(cookieHeader = "") {
    const cookies = {};

    cookieHeader.split(";").forEach(part => {
        const [key, ...value] = part.trim().split("=");

        if (key) {
            cookies[key] = decodeURIComponent(value.join("="));
        }
    });

    return cookies;
}

function encrypt(text) {
    const key = crypto
        .createHash("sha256")
        .update(process.env.SESSION_SECRET)
        .digest();

    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        key,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([
        iv,
        tag,
        encrypted
    ]).toString("base64url");
}

module.exports = async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            return res.redirect(
                302,
                "/?error=discord_denied"
            );
        }

        if (!code || !state) {
            return res.status(400).send(
                "Missing Discord authorization information."
            );
        }

        const cookies = parseCookies(
            req.headers.cookie
        );

        if (
            !cookies.oauth_state ||
            cookies.oauth_state !== state
        ) {
            return res.status(400).send(
                "Invalid OAuth state."
            );
        }

        const tokenResponse = await fetch(
            "https://discord.com/api/v10/oauth2/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body: new URLSearchParams({
                    client_id:
                        process.env.DISCORD_CLIENT_ID,

                    client_secret:
                        process.env.DISCORD_CLIENT_SECRET,

                    grant_type:
                        "authorization_code",

                    code,

                    redirect_uri:
                        "https://bot-website-ruby-six.vercel.app/api/auth/callback"
                })
            }
        );

        if (!tokenResponse.ok) {
            console.error(
                await tokenResponse.text()
            );

            return res.status(500).send(
                "Discord token exchange failed."
            );
        }

        const tokenData =
            await tokenResponse.json();

        const userResponse = await fetch(
            "https://discord.com/api/v10/users/@me",
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );

        if (!userResponse.ok) {
            return res.status(500).send(
                "Could not retrieve Discord user."
            );
        }

        const user =
            await userResponse.json();

        const guildResponse = await fetch(
            "https://discord.com/api/v10/users/@me/guilds",
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );

        const guilds =
            guildResponse.ok
                ? await guildResponse.json()
                : [];

        const session = {
            user: {
                id: user.id,
                username: user.username,
                global_name:
                    user.global_name,
                avatar: user.avatar
            },

            guilds: guilds.map(guild => ({
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                owner: guild.owner,
                permissions: guild.permissions
            })),

            accessToken:
                tokenData.access_token
        };

        const encryptedSession =
            encrypt(
                JSON.stringify(session)
            );

        res.setHeader(
            "Set-Cookie",
            [
                `session=${encryptedSession}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`,

                `oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
            ]
        );

        res.redirect(302, "/");

    } catch (error) {
        console.error(error);

        res.status(500).send(
            "Authentication failed."
        );
    }
};
