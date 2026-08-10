export default async function handler(req, res) {

    const token = getCookie(
        req.headers.cookie,
        "discord_access_token"
    );

    console.log(
        "Cookie received:",
        token ? "YES" : "NO"
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

        const data = await response.json();

        if (!response.ok) {

            console.error(
                "Discord user request failed:",
                data
            );

            res.setHeader(
                "Set-Cookie",
                "discord_access_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
            );

            return res.status(401).json({
                authenticated: false
            });
        }

        return res.status(200).json({

            authenticated: true,

            user: {
                id: data.id,
                username: data.username,
                global_name: data.global_name,
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


function getCookie(
    cookieHeader,
    name
) {

    if (!cookieHeader) {
        return null;
    }

    const cookies =
        cookieHeader.split(";");

    for (const cookie of cookies) {

        const trimmed =
            cookie.trim();

        const separator =
            trimmed.indexOf("=");

        if (separator === -1) {
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

        if (key === name) {

            return decodeURIComponent(
                value
            );
        }
    }

    return null;
}