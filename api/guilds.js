import crypto from "crypto";

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
        decipher.final("utf8");

    return decrypted;
}


function getCookie(req, name) {

    const header =
        req.headers?.cookie || "";

    for (const part of header.split(";")) {

        const index =
            part.indexOf("=");

        if (index === -1) continue;

        const key =
            part.slice(0, index).trim();

        const value =
            part.slice(index + 1).trim();

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


export default async function handler(req, res) {

    try {

        // ==========================================
        // SESSION SECRET
        // ==========================================

        const sessionSecret =
            process.env.SESSION_SECRET;

        if (!sessionSecret) {

            return res.status(500).json({
                error:
                    "Missing SESSION_SECRET"
            });

        }


        // ==========================================
        // DASHBOARD API SECRET
        // ==========================================

        const dashboardSecret =
            process.env.DASHBOARD_API_SECRET;

        if (!dashboardSecret) {

            return res.status(500).json({
                error:
                    "Missing DASHBOARD_API_SECRET"
            });

        }


        // ==========================================
        // GET DISCORD SESSION
        // ==========================================

        const session =
            getCookie(
                req,
                "discord_session"
            );

        if (!session) {

            return res.status(401).json({
                error:
                    "Not authenticated"
            });

        }


        // ==========================================
        // DECRYPT SESSION
        // ==========================================

        let token;

        try {

            token =
                decrypt(
                    session,
                    sessionSecret
                );

        } catch {

            return res.status(401).json({
                error:
                    "Invalid session"
            });

        }


        // ==========================================
        // VERIFY DISCORD USER
        // ==========================================

        const userResponse =
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


        if (!userResponse.ok) {

            return res.status(401).json({
                error:
                    "Discord session expired"
            });

        }


        const user =
            await userResponse.json();


        // ==========================================
        // ASK RAILWAY FOR GUILDS
        // ==========================================

        const railwayUrl =
            process.env.RAILWAY_API_URL ||
            "https://discord-bot-production-1488.up.railway.app";


        const response =
            await fetch(
                `${railwayUrl}/api/guilds?userId=${encodeURIComponent(user.id)}`,
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${dashboardSecret}`,

                        "Content-Type":
                            "application/json"
                    },

                    cache: "no-store"
                }
            );


        // ==========================================
        // RAILWAY ERROR
        // ==========================================

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Railway guild API error:",
                response.status,
                errorText
            );

            return res.status(
                response.status
            ).json({

                error:
                    "Failed to retrieve Discord servers"

            });

        }


        // ==========================================
        // GET RAILWAY DATA
        // ==========================================

        const data =
            await response.json();


        const guilds =
            Array.isArray(data.guilds)
                ? data.guilds
                : [];


        // ==========================================
        // RETURN TO DASHBOARD
        // ==========================================

        return res.status(200).json({
            guilds
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