import { requireAnySession } from "../lib/requireAuth.js";

const RAILWAY_API =
  process.env.BOT_API_URL ||
  "https://discord-bot-production-1488.up.railway.app";

function botToken() {
  return (
    process.env.DISCORD_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.DISCORD_TOKEN ||
    ""
  );
}

function encodeEmoji(emoji) {
  const s = String(emoji || "").trim();
  const m = s.match(/^<?(a)?:([\w]+):(\d+)>?$/);
  if (m) return `${m[2]}:${m[3]}`;
  return encodeURIComponent(s);
}

const CURATED_GIFS = [
  {
    id: "coffee1",
    title: "coffee",
    url: "https://media.giphy.com/media/3oKIPenx4xqQylV0li/giphy.gif",
    preview: "https://media.giphy.com/media/3oKIPenx4xqQylV0li/200.gif",
  },
  {
    id: "wave1",
    title: "wave",
    url: "https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/giphy.gif",
    preview: "https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/200.gif",
  },
  {
    id: "thumb1",
    title: "thumbs up",
    url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    preview: "https://media.giphy.com/media/111ebonMs90YLu/200.gif",
  },
  {
    id: "lol1",
    title: "lol",
    url: "https://media.giphy.com/media/10JhviFuU2dRC/giphy.gif",
    preview: "https://media.giphy.com/media/10JhviFuU2dRC/200.gif",
  },
  {
    id: "love1",
    title: "heart",
    url: "https://media.giphy.com/media/l0MYt5jPR6QX5PNYk/giphy.gif",
    preview: "https://media.giphy.com/media/l0MYt5jPR6QX5PNYk/200.gif",
  },
  {
    id: "clap1",
    title: "clap",
    url: "https://media.giphy.com/media/7rj2ZgEhXXgLG/giphy.gif",
    preview: "https://media.giphy.com/media/7rj2ZgEhXXgLG/200.gif",
  },
  {
    id: "sad1",
    title: "sad",
    url: "https://media.giphy.com/media/OPU6wZxO1k1bO/giphy.gif",
    preview: "https://media.giphy.com/media/OPU6wZxO1k1bO/200.gif",
  },
];

async function handleGifs(req, res) {
  const q = String(req.query.q || "").trim() || "hello";

  if (process.env.TENOR_API_KEY) {
    const url =
      "https://tenor.googleapis.com/v2/search?q=" +
      encodeURIComponent(q) +
      "&key=" +
      encodeURIComponent(process.env.TENOR_API_KEY) +
      "&client_key=coffee_shop_dashboard&limit=24&media_filter=gif";
    const r = await fetch(url);
    const data = await r.json().catch(() => ({}));
    const results = Array.isArray(data.results) ? data.results : [];
    const gifs = results
      .map((item) => {
        const media = item.media_formats || {};
        const gif = media.gif || media.mediumgif || media.tinygif || {};
        const preview = media.tinygif || media.nanogif || media.gif || {};
        return {
          id: String(item.id),
          title: item.content_description || item.title || q,
          url: gif.url || "",
          preview: preview.url || gif.url || "",
        };
      })
      .filter((g) => g.url);
    return res.status(200).json({ gifs, source: "tenor" });
  }

  if (process.env.GIPHY_API_KEY) {
    const url =
      "https://api.giphy.com/v1/gifs/search?api_key=" +
      encodeURIComponent(process.env.GIPHY_API_KEY) +
      "&q=" +
      encodeURIComponent(q) +
      "&limit=24&rating=pg-13";
    const r = await fetch(url);
    const data = await r.json().catch(() => ({}));
    const results = Array.isArray(data.data) ? data.data : [];
    const gifs = results
      .map((item) => ({
        id: String(item.id),
        title: item.title || q,
        url: item.images?.original?.url || item.images?.downsized?.url || "",
        preview:
          item.images?.fixed_height_small?.url ||
          item.images?.preview_gif?.url ||
          "",
      }))
      .filter((g) => g.url);
    return res.status(200).json({ gifs, source: "giphy" });
  }

  const needle = q.toLowerCase();
  let gifs = CURATED_GIFS.filter(
    (g) => !needle || g.title.toLowerCase().includes(needle) || needle === "hello"
  );
  if (!gifs.length) gifs = CURATED_GIFS;
  return res.status(200).json({
    gifs,
    source: "curated",
    hint: "Set TENOR_API_KEY or GIPHY_API_KEY on Vercel for full GIF search",
  });
}

async function handleReact(req, res, body) {
  const token = botToken();
  if (!token) {
    return res.status(500).json({
      error: "DISCORD_BOT_TOKEN not set on Vercel — cannot add reactions",
    });
  }

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
}

export default async function handler(req, res) {
  try {
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || "Not authenticated" });
    }

    // GET ?resource=gifs — GIF search (merged to stay under Hobby function limit)
    if (req.method === "GET" && String(req.query.resource || "") === "gifs") {
      return await handleGifs(req, res);
    }

    const dashboardSecret = process.env.DASHBOARD_API_SECRET;
    if (!dashboardSecret) {
      return res.status(500).json({ error: "Missing DASHBOARD_API_SECRET" });
    }

    let guildId = req.query?.guildId;
    let channelId = req.query?.channelId;

    const body =
      req.method === "POST"
        ? typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {}
        : {};

    if (req.method === "POST") {
      if (!guildId) guildId = body.guildId;
      if (!channelId) channelId = body.channelId;
    }

    // POST action=react — Discord reaction via bot token
    if (req.method === "POST" && String(body.action || "") === "react") {
      return await handleReact(req, res, body);
    }

    if (req.method === "POST" && body.action && ["warn", "mute", "ban", "kick"].includes(String(body.action))) {
      if (!guildId || !body.userId) {
        return res.status(400).json({ error: "Missing guildId or userId" });
      }
      const response = await fetch(`${RAILWAY_API}/api/guild/${guildId}/punish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dashboardSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: body.action,
          userId: body.userId,
          reason: body.reason,
          duration: body.duration,
          evidence: body.evidence || null,
          channelId: channelId && channelId !== "punish" ? channelId : null,
          moderatorTag: body.moderatorTag || "Dashboard",
          moderatorId: body.moderatorId || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status).json(data);
      return res.status(200).json(data);
    }

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
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status).json(data);
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const { guildId: _g, channelId: _c, ...payload } = body;
      const response = await fetch(base, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dashboardSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status).json(data);
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Messages API error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Failed",
    });
  }
}
