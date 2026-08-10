const crypto = require("crypto");

function parseCookies(cookieHeader = "") {
    const cookies = {};

    cookieHeader.split(";").forEach(part => {
        const [key, ...value] = part.trim().split("=");

        if (key) {
            cookies[key] = decodeURIComponent(
                value.join("=")
            );
        }
    });

    return cookies;
}

function decrypt(token) {
    const key = crypto
        .createHash("sha256")
        .update(process.env.SESSION_SECRET)
        .digest();

    const data =
        Buffer.from(token, "base64url");

    const iv =
        data.subarray(0, 12);

    const tag =
        data.subarray(12, 28);

    const encrypted =
        data.subarray(28);

    const decipher =
        crypto.createDecipheriv(
            "aes-256-gcm",
            key,
            iv
        );

    decipher.setAuthTag(tag);

    return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]).toString("utf8");
}

module.exports = async (req, res) => {
    try {
        const cookies =
            parseCookies(
                req.headers.cookie
            );

        if (!cookies.session) {
            return res.status(401).json({
                loggedIn: false
            });
        }

        const session =
            JSON.parse(
                decrypt(cookies.session)
            );

        return res.status(200).json({
            loggedIn: true,
            user: session.user,
            guilds: session.guilds
        });

    } catch (error) {
        console.error(error);

        return res.status(401).json({
            loggedIn: false
        });
    }
};
