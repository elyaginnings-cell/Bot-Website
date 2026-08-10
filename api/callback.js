import crypto from "crypto";
function decrypt(encryptedText, secret) {
    const [ivHex, encrypted] =
        encryptedText.split(".");
    const iv =
        Buffer.from(ivHex, "hex");
    const key =
        crypto
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
    const cookies =
        req.headers.cookie || "";
    const parts =
        cookies.split(";");
    for (const part of parts) {
        const [key, ...value] =
            part.trim().split("=");
        if (key === name) {
            return decodeURIComponent(
                value.join("=")
            );
        }
    }
    return null;
}
export default async function handler(req, res) {
    try {
        /*
         * Get the encrypted Discord session
         * from the HttpOnly cookie.
         */
        const encryptedSession =
            getCookie(
                req,
                "discord_session"
            );
        if (!encryptedSession) {
            return res.status(401).json({
                error: "Not authenticated"
            });
        }
        const sessionSecret =
            process.env.SESSION_SECRET;
        if (!sessionSecret) {
            return res.status(500).json({
                error:
                    "SESSION_SECRET is missing"
            });
        }
        /*
         * Decrypt the Discord access token.
         */
        let discordToken;
        try {
            discordToken =
                decrypt(
                    encryptedSession,
                    sessionSecret
                );
        } catch (error) {
            console.error(
                "Session decryption failed:",
                error
            );
            return res.status(401).json({
                error:
                    "Invalid session"
            });
        }
        /*
         * Ask Discord for the servers
         * belonging to the logged-in user.
         */
        const discordResponse =
            await fetch(
                "https://discord.com/api/users/@me/guilds",
                {
                    headers: {
                        Authorization:
                            `Bearer ${discordToken}`
                    }
                }
            );
        if (!discordResponse.ok) {
            const errorText =
                await discordResponse.text();
            console.error(
                "Discord guild request failed:",
                errorText
            );
            return res.status(
                discordResponse.status
            ).json({
                error:
                    "Discord rejected the request"
            });
        }
        const guilds =
            await discordResponse.json();
        /*
         * Discord permissions:
         *
         * ADMINISTRATOR = 8
         * MANAGE_GUILD = 32
         *
         * Only show servers where the
         * user can actually manage the server.
         */
        const manageableGuilds =
            guilds.filter(guild => {
                const permissions =
                    BigInt(
                        guild.permissions || "0"
                    );
                const ADMINISTRATOR =
                    BigInt(8);
                const MANAGE_GUILD =
                    BigInt(32);
                return (
                    (permissions &
                        ADMINISTRATOR) !==
                        BigInt(0)
                ) ||
                (
                    (permissions &
                        MANAGE_GUILD) !==
                        BigInt(0)
                );
            });
        /*
         * Send the servers to the website.
         */
        return res.status(200).json({
            guilds:
                manageableGuilds.map(guild => ({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon,
                    owner: guild.owner,
                    permissions:
                        guild.permissions
                }))
        });
    } catch (error) {
        console.error(
            "Guild API error:",
            error
        );
        return res.status(500).json({
            error:
                "Failed to retrieve Discord servers"
        });
    }
}