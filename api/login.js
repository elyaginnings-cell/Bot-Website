export default function handler(req, res) {

    const clientId =
        process.env.DISCORD_CLIENT_ID;

    const redirectUri =
        process.env.DISCORD_REDIRECT_URI;


    if (!clientId) {

        return res.status(500).send(
            "Missing DISCORD_CLIENT_ID."
        );
    }


    if (!redirectUri) {

        return res.status(500).send(
            "Missing DISCORD_REDIRECT_URI."
        );
    }


    try {

        new URL(
            redirectUri
        );

    } catch {

        return res.status(500).send(
            "DISCORD_REDIRECT_URI is not a valid URL."
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
        "https://discord.com/oauth2/authorize?" +
        params.toString();


    res.redirect(
        302,
        discordUrl
    );
}