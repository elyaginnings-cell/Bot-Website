export default function handler(req, res) {

    res.setHeader(
        "Set-Cookie",
        "discord_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0"
    );

    res.redirect(302, "/");
}