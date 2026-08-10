import crypto from “crypto”;

/* =========================================================
DECRYPT SESSION
========================================================= */

function decrypt(text, secret) {

const parts =
    text.split(".");
if (parts.length !== 2) {
    throw new Error(
        "Invalid session format"
    );
}
const iv =
    Buffer.from(
        parts[0],
        "hex"
    );
const encrypted =
    parts[1];
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
    decipher.final(
        "utf8"
    );
return decrypted;

}

/* =========================================================
GUILD API
========================================================= */

export default async function handler(
req,
res
) {

try {
    /* -------------------------------------------------
       Get environment variable
    ------------------------------------------------- */
    const sessionSecret =
        process.env.SESSION_SECRET;
    if (!sessionSecret) {
        console.error(
            "SESSION_SECRET is missing."
        );
        return res.status(500).json({
            error:
                "SESSION_SECRET is not configured."
        });
    }
    /* -------------------------------------------------
       Get authentication cookie
    ------------------------------------------------- */
    const sessionCookie =
        req.cookies?.discord_session;
    if (!sessionCookie) {
        console.log(
            "No discord_session cookie found."
        );
        return res.status(401).json({
            authenticated:
                false,
            error:
                "Not authenticated."
        });
    }
    /* -------------------------------------------------
       Decode cookie
    ------------------------------------------------- */
    let encodedSession;
    try {
        encodedSession =
            decodeURIComponent(
                sessionCookie
            );
    } catch {
        encodedSession =
            sessionCookie;
    }
    /* -------------------------------------------------
       Decrypt Discord access token
    ------------------------------------------------- */
    let discordToken;
    try {
        discordToken =
            decrypt(
                encodedSession,
                sessionSecret
            );
    } catch (error) {
        console.error(
            "Session decryption failed:",
            error
        );
        return res.status(401).json({
            authenticated:
                false,
            error:
                "Invalid authentication session."
        });
    }
    if (!discordToken) {
        return res.status(401).json({
            authenticated:
                false,
            error:
                "Discord token missing."
        });
    }
    /* -------------------------------------------------
       Ask Discord for user's servers
    ------------------------------------------------- */
    const response =
        await fetch(
            "https://discord.com/api/users/@me/guilds",
            {
                method:
                    "GET",
                headers: {
                    Authorization:
                        `Bearer ${discordToken}`
                }
            }
        );
    /* -------------------------------------------------
       Discord rejected request
    ------------------------------------------------- */
    if (!response.ok) {
        const errorText =
            await response.text();
        console.error(
            "Discord guild request failed:",
            response.status,
            errorText
        );
        return res.status(
            response.status
        ).json({
            error:
                "Discord rejected the request."
        });
    }
    /* -------------------------------------------------
       Parse guilds
    ------------------------------------------------- */
    const guilds =
        await response.json();
    /* -------------------------------------------------
       Permission constants
    ------------------------------------------------- */
    const ADMINISTRATOR =
        BigInt(0x8);
    const MANAGE_GUILD =
        BigInt(0x20);
    /* -------------------------------------------------
       Only return servers the user can manage
    ------------------------------------------------- */
    const manageableGuilds =
        guilds.filter(
            guild => {
                try {
                    const permissions =
                        BigInt(
                            guild.permissions ||
                            "0"
                        );
                    return (
                        (
                            permissions &
                            ADMINISTRATOR
                        ) !== BigInt(0)
                        ||
                        (
                            permissions &
                            MANAGE_GUILD
                        ) !== BigInt(0)
                    );
                } catch {
                    return false;
                }
            }
        );
    /* -------------------------------------------------
       Return servers
    ------------------------------------------------- */
    return res.status(200).json({
        guilds:
            manageableGuilds
    });
} catch (error) {
    console.error(
        "Guild API error:",
        error
    );
    return res.status(500).json({
        error:
            "Failed to retrieve Discord servers."
    });
}

}