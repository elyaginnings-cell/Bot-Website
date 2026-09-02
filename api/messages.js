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

async function requireAuth(req) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) throw new Error("Missing SESSION_SECRET");
  const session = getCookie(req, "discord_session");
  if (!session) {
    const err = new Error("Not authenticated");
    err.status = 401;
    throw err;
  }
  try {
    decrypt(session, sessionSecret);
  } catch {
    const err = new Error("Invalid session");
    err.status = 401;
    throw err;
  }
}

export default async function handler(req, res) {
  try {
    await requireAuth(req);

    const dashboardSecret = process.env.DASHBOARD_API_SECRET;
    if (!dashboardSecret) {
      return res.status(500).json({ error: "Missing DASHBOARD_API_SECRET" });
    }

    const guildId = req.query?.guildId;
    const channelId = req.query?.channelId;
    if (!guildId || !channelId) {
      return res.status(400).json({ error: "Missing guildId or channelId" });
    }

    const base = `${RAILWAY_API}/api/guild/${guildId}/channels/${channelId}/messages`;

    if (req.method === "GET") {
      const params = new URLSearchParams();
      if (req.query.limit) params.set("limit", String(req.query.limit));
      if (req.query.before) params.set("before", String(req.query.before));
      if (req.query.after) params.set("after", String(req.query.after));
      const qs = params.toString();
      const response = await fetch(qs ? `${base}?${qs}` : base, {
        headers: { Authorization: `Bearer ${dashboardSecret}` },
        cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status).json(data);
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};

      const response = await fetch(base, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dashboardSecret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status).json(data);
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Messages API error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Failed"
    });
  }
}
