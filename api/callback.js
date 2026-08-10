import crypto from "crypto";

function encrypt(text, secret) {
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash("sha256").update(secret).digest();
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}.${encrypted}`;
}

export default async function handler(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send("Missing authorization code.");
    }

    try {
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: "authorization_code",
                code: code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI,
            }),
        });

        if (!tokenResponse.ok) {
            const err = await tokenResponse.text();
            console.error("Token exchange failed:", err);
            return res.status(401).send("Discord authentication failed.");
        }

        const tokenData = await tokenResponse.json();
        const sessionSecret = process.env.SESSION_SECRET;

        const encryptedToken = encrypt(tokenData.access_token, sessionSecret);
        const isProduction = process.env.NODE_ENV === "production";

        const cookieFlags = [
            `discord_session=${encryptedToken}`,
            "Path=/",
            "HttpOnly",
            "SameSite=Lax",
            "Max-Age=604800",
            ...(isProduction ? ["Secure"] : [])
        ].join("; ");

        res.setHeader("Set-Cookie", cookieFlags);

        return res.redirect(302, "/");
    } catch (error) {
        console.error("Callback error:", error);
        return res.status(500).send("Internal server error.");
    }
}
