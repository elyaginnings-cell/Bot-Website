import crypto from "crypto";

function decrypt(data, secret) {
    const [ivHex, encrypted] =
        data.split(".");

    const iv =
        Buffer.from(ivHex, "hex");

    const key = crypto
        .createHash("sha256")
        .update(secret)
        .digest();

    const decipher =
        crypto.createDecipheriv(
            "aes-256-cbc",
            key,
            iv
        );

    let decrypted =
        decipher.update(
            encrypted,
            "hex",
            "utf8"
        );

    decrypted +=
        decipher.final("utf8");

    return decrypted;
}

function getCookie(req, name) {
    const header =
        req.headers.cookie;

    if (!header) {
        return null;
    }

    const cookies =
        header.split(";");

    for (const cookie of cookies) {

        const index =
            cookie.indexOf("=");

        if (index === -1) {
            continue;
        }

        const key =
            cookie.slice(0, index).trim();

        const value =
            cookie.slice(index + 1).trim();

        if (key === name) {
            return decodeURIComponent(value);
        }
    }

    return null;
}

export default async function handler(req, res) {

    const session =
        getCookie(
            req,
            "discord_session"
        );

    if (!session) {

        return res.status(401).json({
            authenticated: false
        });
    }

    const secret =
        process.env.SESSION_SECRET;

    if (!secret) {

        return res.status(500).json({
            authenticated: false,
            error: "SESSION_SECRET missing"
        });
    }

    try {

        const token =
            decrypt(
                session,
                secret
            );

        const response =
            await fetch(
                "https://discord.com/api/users/@me",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const user =
            await response.json();

        if (!response.ok) {

            res.setHeader(
                "Set-Cookie",
                "discord_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0"
            );

            return res.status(401).json({
                authenticated: false
            });
        }

        return res.status(200).json({
            authenticated: true,

            user: {
                id: user.id,
                username: user.username,
                global_name:
                    user.global_name,
                avatar: user.avatar
            }
        });

    } catch (error) {

        console.error(error);

        return res.status(401).json({
            authenticated: false
        });
    }
}