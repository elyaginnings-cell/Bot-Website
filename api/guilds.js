export default async function handler(req, res) {

    const token =
        getCookie(
            req.headers.cookie,
            "discord_access_token"
        );


    if (!token) {

        return res.status(401).json({
            error: "Not authenticated."
        });

    }


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


    if (!response.ok) {

        return res.status(401).json({
            error: "Discord authentication expired."
        });

    }


    const guilds =
        await response.json();


    /*
     * ADMINISTRATOR = 0x8
     * MANAGE_GUILD = 0x20
     */

    const manageableGuilds =
        guilds.filter(guild => {

            const permissions =
                BigInt(guild.permissions);

            const administrator =
                (permissions & 0x8n) !== 0n;

            const manageGuild =
                (permissions & 0x20n) !== 0n;

            return administrator || manageGuild;

        });


    res.status(200).json(
        manageableGuilds.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon
        }))
    );
}


function getCookie(cookieHeader, name) {

    if (!cookieHeader)
        return null;


    const cookies =
        cookieHeader.split(";");


    for (const cookie of cookies) {

        const [
            key,
            ...value
        ] = cookie.trim().split("=");


        if (key === name) {

            return decodeURIComponent(
                value.join("=")
            );

        }

    }


    return null;
}