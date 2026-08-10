import crypto from "crypto";

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
        decipher.final("utf8");


    return decrypted;
}


function getCookie(req, name) {

    const header =
        req.headers?.cookie || "";

    if (!header) return null;


    for (const cookie of header.split(";")) {

        const index =
            cookie.indexOf("=");

        if (index === -1) continue;


        const key =
            cookie.slice(0, index).trim();

        const value =
            cookie.slice(index + 1).trim();


        if (key === name) {

            try {
                return decodeURIComponent(value);
            } catch {
                return value;
            }
        }
    }


    return null;
}


function clearSession(res) {

    const cookieFlags = [
        "discord_session=",
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=0"
    ];


    if (process.env.NODE_ENV === "production") {
        cookieFlags.push("Secure");
    }


    res.setHeader(
        "Set-Cookie",
        cookieFlags.join("; ")
    );
}


export default async function handler(req, res) {

    try {

        const secret =
            process.env.SESSION_SECRET;


        if (!secret) {

            return res.status(500).json({
                authenticated: false,
                error:
                    "Missing SESSION_SECRET"
            });
        }


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


        let token;

        try {

            token =
                decrypt(
                    session,
                    secret
                );

        } catch {

            clearSession(res);

            return res.status(401).json({
                authenticated: false
            });
        }


        const response =
            await fetch(
                "https://discord.com/api/users/@me",
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


        if (!response.ok) {

            clearSession(res);

            return res.status(401).json({
                authenticated: false
            });
        }


        const data =
            await response.json();


        return res.status(200).json({

            authenticated: true,

            user: {
                id: data.id,
                username: data.username,
                global_name:
                    data.global_name,
                avatar: data.avatar
            }

        });

    } catch (error) {

        console.error(
            "User API error:",
            error
        );

        return res.status(500).json({
            authenticated: false
        });
    }
}