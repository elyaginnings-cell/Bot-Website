import crypto from “crypto”;

/* =========================================================
DECRYPT SESSION
========================================================= */

function decrypt(data, secret) {

const parts =
    data.split(".");
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
COOKIE READER
========================================================= */

function getCookie(
req,
name
) {

const header =
    req.headers.cookie;
if (!header) {
    return null;
}
const cookies =
    header.split(";");
for (
    const cookie of cookies
) {
    const index =
        cookie.indexOf("=");
    if (index === -1) {
        continue;
    }
    const key =
        cookie
            .slice(
                0,
                index
            )
            .trim();
    const value =
        cookie
            .slice(
                index + 1
            )
            .trim();
    if (key === name) {
        try {
            return decodeURIComponent(
                value
            );
        } catch {
            return value;
        }
    }
}
return null;

}

/* =========================================================
USER API
========================================================= */

export default async function handler(
req,
res
) {

try {
    console.log(
        "🔐 /api/user called"
    );
    /* -------------------------------------------------
       Session secret
    ------------------------------------------------- */
    const secret =
        process.env.SESSION_SECRET;
    if (!secret) {
        console.error(
            "❌ SESSION_SECRET missing"
        );
        return res.status(500).json({
            authenticated:
                false,
            error:
                "SESSION_SECRET missing"
        });
    }
    /* -------------------------------------------------
       Get session cookie
    ------------------------------------------------- */
    const session =
        getCookie(
            req,
            "discord_session"
        );
    if (!session) {
        console.log(
            "❌ discord_session cookie not found"
        );
        return res.status(401).json({
            authenticated:
                false,
            error:
                "No authentication session"
        });
    }
    console.log(
        "✅ discord_session cookie found"
    );
    /* -------------------------------------------------
       Decrypt Discord token
    ------------------------------------------------- */
    let token;
    try {
        token =
            decrypt(
                session,
                secret
            );
    } catch (error) {
        console.error(
            "❌ Session decryption failed:",
            error
        );
        return res.status(401).json({
            authenticated:
                false,
            error:
                "Invalid authentication session"
        });
    }
    if (!token) {
        return res.status(401).json({
            authenticated:
                false
        });
    }
    /* -------------------------------------------------
       Ask Discord who the user is
    ------------------------------------------------- */
    const response =
        await fetch(
            "https://discord.com/api/users/@me",
            {
                method:
                    "GET",
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );
    const data =
        await response.json();
    /* -------------------------------------------------
       Discord rejected token
    ------------------------------------------------- */
    if (!response.ok) {
        console.error(
            "❌ Discord user request failed:",
            response.status,
            data
        );
        res.setHeader(
            "Set-Cookie",
            [
                "discord_session=",
                "Path=/",
                "HttpOnly",
                "Secure",
                "SameSite=None",
                "Max-Age=0"
            ].join("; ")
        );
        return res.status(401).json({
            authenticated:
                false,
            error:
                "Discord session expired"
        });
    }
    /* -------------------------------------------------
       Successful authentication
    ------------------------------------------------- */
    console.log(
        "✅ Discord user authenticated:",
        data.username
    );
    return res.status(200).json({
        authenticated:
            true,
        user: {
            id:
                data.id,
            username:
                data.username,
            global_name:
                data.global_name,
            avatar:
                data.avatar
        }
    });
} catch (error) {
    console.error(
        "❌ /api/user error:",
        error
    );
    return res.status(500).json({
        authenticated:
            false,
        error:
            "Authentication server error"
    });
}

}