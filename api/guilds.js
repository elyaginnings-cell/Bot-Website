export default async function handler(
    req,
    res
) {

    const token =
        getCookie(
            req.headers.cookie,
            "discord_access_token"
        );


    if (!token) {

        return res.status(401).json({

            error:
                "Not authenticated."

        });

    }


    try {

        const response =
            await fetch(
                "https://discord.com/api/users/@me/guilds",
                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`

                    }

                }
            );


        const guilds =
            await response.json();


        if (!response.ok) {

            console.error(
                "Discord guild error:",
                guilds
            );


            return res.status(401).json({

                error:
                    "Discord authentication expired."

            });

        }


        /*
         * Discord permissions:
         *
         * Administrator = 0x8
         * Manage Server = 0x20
         */

        const manageableGuilds =
            guilds.filter(
                guild => {

                    const permissions =
                        BigInt(
                            guild.permissions
                        );


                    const administrator =
                        (
                            permissions &
                            0x8n
                        ) !== 0n;


                    const manageGuild =
                        (
                            permissions &
                            0x20n
                        ) !== 0n;


                    return (
                        administrator ||
                        manageGuild
                    );

                }
            );


        return res.status(200).json(

            manageableGuilds.map(
                guild => ({

                    id:
                        guild.id,

                    name:
                        guild.name,

                    icon:
                        guild.icon

                })
            )

        );

    } catch (error) {

        console.error(
            "Guild API error:",
            error
        );


        return res.status(500).json({

            error:
                "Could not load Discord servers."

        });

    }
}


function getCookie(
    cookieHeader,
    name
) {

    if (!cookieHeader) {
        return null;
    }


    const cookies =
        cookieHeader.split(";");


    for (
        const cookie
        of cookies
    ) {

        const trimmed =
            cookie.trim();


        const separator =
            trimmed.indexOf("=");


        if (
            separator === -1
        ) {

            continue;

        }


        const key =
            trimmed.substring(
                0,
                separator
            );


        const value =
            trimmed.substring(
                separator + 1
            );


        if (
            key === name
        ) {

            return decodeURIComponent(
                value
            );

        }

    }


    return null;
}