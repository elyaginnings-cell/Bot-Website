export default function handler(req, res) {

    const clientId =
        process.env.DISCORD_CLIENT_ID;

    const redirectUri =
        process.env.DISCORD_REDIRECT_URI;


    if (!clientId) {

        return res.status(500).send(
            "DISCORD_CLIENT_ID is missing."
        );

    }


    if (!redirectUri) {

        return res.status(500).send(
            "DISCORD_REDIRECT_URI is missing."
        );

    }


    try {

        new URL(
            redirectUri
        );

    } catch {

        return res.status(500).send(
            `Invalid redirect URI: ${redirectUri}`
        );

    }


    const params =
        new URLSearchParams({

            client_id:
                clientId,

            response_type:
                "code",

            redirect_uri:
                redirectUri,

            scope:
                "identify guilds"

        });


    const discordUrl =
        `https://discord.com/oauth2/authorize?${params.toString()}`;


    res.redirect(
        302,
        discordUrl
    );
}