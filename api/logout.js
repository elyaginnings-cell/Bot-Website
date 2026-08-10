export default function handler(req, res) {
    const cookieFlags = [
        "discord_session=",
        "Path=/",
        "HttpOnly",
        "Max-Age=0",
        "SameSite=Lax",
        ...(process.env.NODE_ENV === "production" ? ["Secure"] : [])
    ].join("; ");

    res.setHeader("Set-Cookie", cookieFlags);
    return res.redirect(302, "/");
}
