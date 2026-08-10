export default async function handler(req, res) {

    const token =
        getCookie(
            req.headers.cookie,
            "discord_access_token"
        );

    if (!token) {
        return res.status(401).json({
            authenticated: false
        });
    }

    try {

        const response = await fetch(
            "https://discord.com/api/users/@me",
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {

            return res.status(401).json({
                authenticated: false
            });

        }

        const user =
            await response.json();

        return res.status(200).json({
            authenticated: true,
            user: {
                id: user.id,
                username: user.username,
                global_name: user.global_name,
                avatar: user.avatar
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


function getCookie(cookieHeader, name) {

    if (!cookieHeader) {
        return null;
    }

    const cookies =
        cookieHeader.split(";");

    for (const cookie of cookies) {

        const parts =
            cookie.trim().split("=");

        const key =
            parts.shift();

        const value =
            parts.join("=");

        if (key === name) {

            return decodeURIComponent(
                value
            );

        }
    }

    return null;
}