import crypto from "crypto";

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

        const secret =
            process.env.SESSION_SECRET;

        if (!secret) {
            return res.status(500).json({
                error: "Missing SESSION_SECRET"
            });
        }


        const session =
            getCookie(
                req,
                "discord_session"
            );

        if (!session) {
            return res.status(401).json({
                error: "Not authenticated"
            });
        }


        let token;

        try {
            token = decrypt(
                session,
                secret
            );
        } catch {
            return res.status(401).json({
                error: "Invalid session"
            });
        }


        const response =
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


        if (!response.ok) {

            if (response.status === 401) {
                return res.status(401).json({
                    error: "Discord session expired"
                });
            }

            return res.status(response.status).json({
                error: "Discord rejected request"
            });
        }


        const guilds =
            await response.json();


        const ADMINISTRATOR = BigInt(0x8);
        const MANAGE_GUILD = BigInt(0x20);


        const manageableGuilds =
            guilds

                .filter((guild) => {

                    try {

                        const permissions =
                            BigInt(
                                guild.permissions || "0"
                            );

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

                    } catch {
                        return false;
                    }
                })


                .map((guild) => ({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon,
                    owner: Boolean(guild.owner),

                    approximate_member_count:
                        Number(
                            guild.approximate_member_count || 0
                        ),

                    approximate_presence_count:
                        Number(
                            guild.approximate_presence_count || 0
                        )
                }));


        return res.status(200).json({
            guilds: manageableGuilds
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