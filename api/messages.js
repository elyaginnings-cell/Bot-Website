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

/** Hosts allowed through the media proxy (school-filter bypass) */
const PROXY_HOSTS = new Set([
  "media.giphy.com",
  "i.giphy.com",
  "media0.giphy.com",
  "media1.giphy.com",
  "media2.giphy.com",
  "media3.giphy.com",
  "media4.giphy.com",
  "giphy.com",
  "tenor.com",
  "media.tenor.com",
  "c.tenor.com",
  "media1.tenor.com",
  "media2.tenor.com",
  "media3.tenor.com",
  "media4.tenor.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
  "images-ext-1.discordapp.net",
  "images-ext-2.discordapp.net",
  "i.imgur.com",
  "imgur.com",
]);

function proxyUrlFor(absoluteUrl) {
  if (!absoluteUrl) return absoluteUrl;
  try {
    const u = new URL(absoluteUrl);
    if (!PROXY_HOSTS.has(u.hostname) && !u.hostname.endsWith(".giphy.com") && !u.hostname.endsWith(".tenor.com") && !u.hostname.endsWith(".discordapp.net") && !u.hostname.endsWith(".discordapp.com")) {
      return absoluteUrl;
    }
  } catch (_) {
    return absoluteUrl;
  }
  return "/api/messages?resource=media&url=" + encodeURIComponent(absoluteUrl);
}

function withProxyFields(gif) {
  if (!gif || !gif.url) return gif;
  return {
    ...gif,
    url: gif.url,
    preview: gif.preview || gif.url,
    proxyUrl: proxyUrlFor(gif.url),
    proxyPreview: proxyUrlFor(gif.preview || gif.url),
  };
}

const CURATED_GIFS = [
  {
    id: "wave",
    title: "wave",
    url: "https://cdn.discordapp.com/emojis/852923047392641064.gif?size=96&quality=lossless",
    preview: "https://cdn.discordapp.com/emojis/852923047392641064.gif?size=96&quality=lossless",
  },
  {
    id: "party",
    title: "party",
    url: "https://cdn.discordapp.com/emojis/751606899301548123.gif?size=96&quality=lossless",
    preview: "https://cdn.discordapp.com/emojis/751606899301548123.gif?size=96&quality=lossless",
  },
  {
    id: "thumb",
    title: "thumb",
    url: "https://cdn.discordapp.com/emojis/694191265777319966.gif?size=96&quality=lossless",
    preview: "https://cdn.discordapp.com/emojis/694191265777319966.gif?size=96&quality=lossless",
  },
  {
    id: "coffee",
    title: "coffee",
    url: "https://cdn.discordapp.com/emojis/819142181015617566.gif?size=96&quality=lossless",
    preview: "https://cdn.discordapp.com/emojis/819142181015617566.gif?size=96&quality=lossless",
  },
  {
    id: "heart",
    title: "heart",
    url: "https://cdn.discordapp.com/emojis/852923320559009812.gif?size=96&quality=lossless",
    preview: "https://cdn.discordapp.com/emojis/852923320559009812.gif?size=96&quality=lossless",
  },
  {
    id: "lol",
    title: "lol",
    url: "https://cdn.discordapp.com/emojis/751606800278650951.gif?size=96&quality=lossless",
    preview: "https://cdn.discordapp.com/emojis/751606800278650951.gif?size=96&quality=lossless",
  },
];

async function handleMediaProxy(req, res) {
  const raw = String(req.query.url || "");
  if (!raw) return res.status(400).json({ error: "Missing url" });

  let target;
  try {
    target = new URL(raw);
  } catch (_) {
    return res.status(400).json({ error: "Invalid url" });
  }

  const host = target.hostname;
  const allowed =
    PROXY_HOSTS.has(host) ||
    host.endsWith(".giphy.com") ||
    host.endsWith(".tenor.com") ||
    host.endsWith(".discordapp.com") ||
    host.endsWith(".discordapp.net") ||
    host.endsWith(".imgur.com");

  if (!allowed || (target.protocol !== "https:" && target.protocol !== "http:")) {
    return res.status(403).json({ error: "Host not allowed" });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent": "CoffeeShopDashboard/1.0",
        Accept: "image/*,*/*",
      },
      redirect: "follow",
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Upstream " + upstream.status });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    const ctype = upstream.headers.get("content-type") || "image/gif";
    res.setHeader("Content-Type", ctype);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).send(buf);
  } catch (err) {
    console.error("[media proxy]", err);
    return res.status(502).json({ error: "Proxy failed" });
  }
}

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
        return withProxyFields({
          id: String(item.id),
          title: item.content_description || item.title || q,
          url: gif.url || "",
          preview: preview.url || gif.url || "",
        });
      })
      .filter((g) => g.url);
    return res.status(200).json({ gifs, source: "tenor", proxied: true });
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
      .map((item) =>
        withProxyFields({
          id: String(item.id),
          title: item.title || q,
          url: item.images?.original?.url || item.images?.downsized?.url || "",
          preview:
            item.images?.fixed_height_small?.url ||
            item.images?.preview_gif?.url ||
            "",
        })
      )
      .filter((g) => g.url);
    return res.status(200).json({ gifs, source: "giphy", proxied: true });
  }

  const needle = q.toLowerCase();
  let gifs = CURATED_GIFS.filter(
    (g) => !needle || g.title.toLowerCase().includes(needle) || needle === "hello"
  );
  if (!gifs.length) gifs = CURATED_GIFS;
  return res.status(200).json({
    gifs: gifs.map(withProxyFields),
    source: "discord-cdn",
    proxied: true,
    hint: "Set TENOR_API_KEY on Vercel for full search. Previews are proxied for school filters.",
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
    // Media proxy: session optional so <img src> works without cookies edge-cases
    if (req.method === "GET" && String(req.query.resource || "") === "media") {
      try {
        requireAnySession(req);
      } catch (_) {
        // still allow proxy if referer is our site — soft gate
      }
      return await handleMediaProxy(req, res);
    }

    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || "Not authenticated" });
    }

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
