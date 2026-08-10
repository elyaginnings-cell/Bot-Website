import { decrypt, getCookie, clearSessionCookie } from "./session.js";

export default async function handler(req, res) {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Missing SESSION_SECRET" });
    }

    const session = getCookie(req, "discord_session");
    if (!session) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let discordToken;
    try {
      discordToken = decrypt(session, secret);
    } catch {
      res.setHeader("Set-Cookie", clearSessionCookie());
      return res.status(401).json({ error: "Invalid session" });
    }

    const response = await fetch(
      "https://discord.com/api/users/@me/guilds?with_counts=true",
      {
        headers: { Authorization: `Bearer ${discordToken}` },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        res.setHeader("Set-Cookie", clearSessionCookie());
      }

      return res
        .status(response.status)
        .json({ error: "Discord rejected request" });
    }

    const guilds = await response.json();

    const ADMINISTRATOR = 0x8n;
    const MANAGE_GUILD = 0x20n;

    const manageableGuilds = guilds
      .filter((guild) => {
        try {
          const permissions = BigInt(guild.permissions || "0");
          return (
            (permissions & ADMINISTRATOR) !== 0n ||
            (permissions & MANAGE_GUILD) !== 0n
          );
        } catch {
          return false;
        }
      })
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: Boolean(guild.owner),
        approximate_member_count: Number(guild.approximate_member_count || 0),
        approximate_presence_count: Number(guild.approximate_presence_count || 0),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({ guilds: manageableGuilds });
  } catch (error) {
    console.error("Guild API error:", error);
    return res.status(500).json({ error: "Failed to retrieve Discord servers" });
  }
}