import crypto from "crypto";

const RAILWAY_API =
    "https://discord-bot-production-1488.up.railway.app";

function decrypt(text, secret) {

    const parts = text.split(".");

    if (parts.length !== 2) {
        throw new Error("Invalid session format");
    }

    const iv =
        Buffer.from(parts[0], "hex");

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
        // ENVIRONMENT VARIABLES
        // ==========================================

        const sessionSecret =
            process.env.SESSION_SECRET;

        const dashboardSecret =
            process.env.DASHBOARD_API_SECRET;


        if (!sessionSecret) {

            return res.status(500).json({
                error:
                    "Missing SESSION_SECRET"
            });

        }


        if (!dashboardSecret) {

            return res.status(500).json({
                error:
                    "Missing DASHBOARD_API_SECRET"
            });

        }


        // ==========================================
        // GET SESSION
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
        // DECRYPT DISCORD TOKEN
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
        // GET USER'S DISCORD SERVERS
        // ==========================================

        const discordResponse =
            await fetch(
                "https://discord.com/api/users/@me/guilds?with_counts=true",
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


        if (!discordResponse.ok) {

            if (
                discordResponse.status === 401
            ) {

                return res.status(401).json({
                    error:
                        "Discord session expired"
                });

            }


            return res.status(
                discordResponse.status
            ).json({
                error:
                    "Discord rejected request"
            });

        }


        const userGuilds =
            await discordResponse.json();


        // ==========================================
        // GET BOT'S SERVERS FROM RAILWAY
        // ==========================================

        const railwayResponse =
            await fetch(
                `${RAILWAY_API}/api/guilds`,
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${dashboardSecret}`
                    },

                    cache: "no-store"
                }
            );


        if (!railwayResponse.ok) {

            console.error(
                "Railway guild request failed:",
                railwayResponse.status
            );


            return res.status(502).json({
                error:
                    "Could not contact Discord bot"
            });

        }


        const railwayData =
            await railwayResponse.json();


        const botGuilds =
            Array.isArray(
                railwayData.guilds
            )
                ? railwayData.guilds
                : [];


        // ==========================================
        // CREATE BOT GUILD LOOKUP
        // ==========================================

        const botGuildMap =
            new Map(
                botGuilds.map(
                    guild => [
                        guild.id,
                        guild
                    ]
                )
            );


        // ==========================================
        // FILTER USER SERVERS
        //
        // User must:
        // 1. Have Administrator OR Manage Server
        // 2. Have the bot in the server
        // ==========================================

        const ADMINISTRATOR =
            BigInt(0x8);

        const MANAGE_GUILD =
            BigInt(0x20);


        const manageableGuilds =
            userGuilds

                .filter(guild => {

                    try {

                        const permissions =
                            BigInt(
                                guild.permissions ||
                                "0"
                            );


                        const canManage =
                            (
                                (
                                    permissions &
                                    ADMINISTRATOR
                                ) !== BigInt(0)
                            ) ||
                            (
                                (
                                    permissions &
                                    MANAGE_GUILD
                                ) !== BigInt(0)
                            );


                        const botIsInServer =
                            botGuildMap.has(
                                guild.id
                            );


                        return (
                            canManage &&
                            botIsInServer
                        );

                    } catch {

                        return false;

                    }

                })


                .map(guild => {

                    const botGuild =
                        botGuildMap.get(
                            guild.id
                        );


                    return {

                        id:
                            guild.id,

                        name:
                            guild.name,

                        icon:
                            guild.icon,

                        owner:
                            Boolean(
                                guild.owner
                            ),

                        approximate_member_count:
                            Number(
                                guild.approximate_member_count ||
                                botGuild?.memberCount ||
                                0
                            ),

                        approximate_presence_count:
                            Number(
                                guild.approximate_presence_count ||
                                0
                            )

                    };

                });


        // ==========================================
        // SEND TO DASHBOARD
        // ==========================================

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
                "Failed to retrieve Discord servers"

        });

    }

}