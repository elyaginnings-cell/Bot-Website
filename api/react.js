import { requireAnySession } from "../lib/requireAuth.js";

function botToken() {
  return (
    process.env.DISCORD_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.DISCORD_TOKEN ||
    ""
  );
}

/** Encode emoji for Discord reaction URL path */
function encodeEmoji(emoji) {
  const s = String(emoji || "").trim();
  // custom emoji name:id
  const m = s.match(/^<?(a)?:([\w]+):(\d+)>?$/);
  if (m) return `${m[2]}:${m[3]}`;
  // unicode
  return encodeURIComponent(s);
}

export default async function handler(req, res) {
  try {
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || "Not authenticated" });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const token = botToken();
    if (!token) {
      return res.status(500).json({
        error: "DISCORD_BOT_TOKEN not set on Vercel — cannot add reactions",
      });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const channelId = body.channelId;
    const messageId = body.messageId;
    const emoji = body.emoji;
    const remove = !!body.remove;

    if (!channelId || !messageId || !emoji) {
      return res.status(400).json({ error: "Need channelId, messageId, emoji" });
    }

    const path = `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeEmoji(emoji)}/@me`;

    const response = await fetch(path, {
      method: remove ? "DELETE" : "PUT",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 204 || response.ok) {
      return res.status(200).json({ ok: true });
    }

    const text = await response.text().catch(() => "");
    return res.status(response.status).json({
      error: text.slice(0, 300) || response.statusText,
    });
  } catch (error) {
    console.error("React API error:", error);
    return res.status(500).json({ error: error.message || "Failed" });
  }
}
