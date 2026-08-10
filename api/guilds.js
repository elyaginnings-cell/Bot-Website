export default async function handler(req, res) {
    try {
        // Get the Discord access token from the authentication cookie
        const token = req.cookies?.discord_token;

        if (!token) {
            return res.status(401).json({
                error: "Not authenticated"
            });
        }

        // Ask Discord for the user's servers
        const response = await fetch(
            "https://discord.com/api/users/@me/guilds",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();

            console.error(
                "Discord guild request failed:",
                errorText
            );

            return res.status(response.status).json({
                error: "Discord rejected the request"
            });
        }

        const guilds = await response.json();

        /*
         * Discord gives us every server the user belongs to.
         *
         * We only want servers where the user has
         * permission to manage the bot.
         *
         * MANAGE_GUILD = 0x20
         * ADMINISTRATOR = 0x8
         */

        const manageableGuilds = guilds.filter(guild => {

            const permissions =
                BigInt(guild.permissions || "0");

            const ADMINISTRATOR =
                BigInt(0x8);

            const MANAGE_GUILD =
                BigInt(0x20);

            return (
                (permissions & ADMINISTRATOR) !== BigInt(0) ||
                (permissions & MANAGE_GUILD) !== BigInt(0)
            );
        });


        return res.status(200).json({
            guilds: manageableGuilds
        });

    } catch (error) {

        console.error(
            "Guild API error:",
            error
        );

        return res.status(500).json({
            error: "Failed to retrieve Discord servers"
        });
    }
}