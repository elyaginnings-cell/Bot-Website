import crypto from "crypto";

const RAILWAY_API =
  process.env.BOT_API_URL ||
  "https://discord-bot-production-1488.up.railway.app";

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
  const header = req.headers?.cookie || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === name) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

export default async function handler(req, res) {
  try {
    const sessionSecret = process.env.SESSION_SECRET;
    const dashboardSecret = process.env.DASHBOARD_API_SECRET;

    if (!sessionSecret || !dashboardSecret) {
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const session = getCookie(req, "discord_session");
    if (!session) return res.status(401).json({ error: "Not authenticated" });

    try {
      decrypt(session, sessionSecret);
    } catch {
      return res.status(401).json({ error: "Invalid session" });
    }

    const guildId = req.query?.guildId;
    if (!guildId) return res.status(400).json({ error: "Missing guildId" });

    const response = await fetch(`${RAILWAY_API}/api/guild/${guildId}/roles`, {
      headers: { Authorization: `Bearer ${dashboardSecret}` },
      cache: "no-store"
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json(data);

    return res.status(200).json(data);
  } catch (error) {
    console.error("Roles API error:", error);
    return res.status(500).json({ error: "Failed to load roles" });
  }
}
