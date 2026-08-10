import crypto from "crypto";

function decrypt(text, secret) {
    const parts = text.split(".");
    if (parts.length !== 2) throw new Error("Invalid session format");

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const key = crypto.createHash("sha256").update(secret).digest();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

function getCookie(req, name) {
    const cookies = req.headers?.cookie || "";
    const parts = cookies.split(";");
    for (const part of parts) {
        const [key, ...value] = part.trim().split("=");
        if (key === name) return decodeURIComponent(value.join("="));
    }
    return null;
}

export default async function handler(req, res) {
    try {
        const sessionSecret = process.env.SESSION_SECRET;
        if (!sessionSecret) return res.status(500).json({ error: "Missing SESSION_SECRET" });

        const sessionCookie = getCookie(req, "discord_session");
        if (!sessionCookie) return res.status(401).json({ error: "Not authenticated" });

        let discordToken;
        try {
            discordToken = decrypt(sessionCookie, sessionSecret);
        } catch {
            return res.status(401).json({ error: "Invalid session" });
        }

        const response = await fetch("https://discord.com/api/users/@me/guilds", {
            method: "GET",
            headers: { Authorization: `Bearer ${discordToken}` }
        });

        if (!response.ok) return res.status(response.status).json({ error: "Discord rejected request" });

        const guilds = await response.json();
        const ADMINISTRATOR = BigInt(0x8);
        const MANAGE_GUILD = BigInt(0x20);

        const manageableGuilds = guilds.filter(guild => {
            try {
                const permissions = BigInt(guild.permissions || "0");
                return (permissions & ADMINISTRATOR) !== BigInt(0) || (permissions & MANAGE_GUILD) !== BigInt(0);
            } catch {
                return false;
            }
        });

        return res.status(200).json({ guilds: manageableGuilds });
    } catch (error) {
        return res.status(500).json({ error: "Failed to retrieve Discord servers" });
    }
}
