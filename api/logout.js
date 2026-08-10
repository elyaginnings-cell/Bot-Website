export default function handler(req, res) {

    const cookieFlags = [
        "discord_session=",
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=0"
    ];


    if (process.env.NODE_ENV === "production") {
        cookieFlags.push("Secure");
    }


    res.setHeader(
        "Set-Cookie",
        cookieFlags.join("; ")
    );


    return res.redirect(
        302,
        "/"
    );
}