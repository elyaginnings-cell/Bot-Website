export default function handler(req, res) {
    const isProduction = process.env.NODE_ENV === "production";

    const cookieFlags = [
        "discord_session=",
        "Path=/",
        "HttpOnly",
        "Max-Age=0",
        "SameSite=Lax",
        ...(isProduction ? ["Secure"] : [])
    ].join("; ");

    res.setHeader("Set-Cookie", cookieFlags);
    return res.redirect(302, "/");
}
