import { requireAnySession } from "../lib/requireAuth.js";

const FALLBACK = [
  { id: "1", url: "https://media.tenor.com/images/6f8c8c8c.gif", preview: "https://media.tenor.com/images/6f8c8c8c.gif", title: "wave" },
];

// Curated no-key fallbacks (tenor CDN style media often works for display)
const CURATED = [
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
    id: "party1",
    title: "party",
    url: "https://media.giphy.com/media/l0MYt5jPR6QX5PNYk/giphy.gif",
    preview: "https://media.giphy.com/media/l0MYt5jPR6QX5PNYk/200.gif",
  },
  {
    id: "sad1",
    title: "sad",
    url: "https://media.giphy.com/media/OPU6wZxO1k1bO/giphy.gif",
    preview: "https://media.giphy.com/media/OPU6wZxO1k1bO/200.gif",
  },
];

export default async function handler(req, res) {
  try {
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || "Not authenticated" });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim() || "hello";
    const key = process.env.TENOR_API_KEY || process.env.GIPHY_API_KEY || "";

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
      const gifs = results.map((item) => {
        const media = item.media_formats || {};
        const gif = media.gif || media.mediumgif || media.tinygif || {};
        const preview = media.tinygif || media.nanogif || media.gif || {};
        return {
          id: String(item.id),
          title: item.content_description || item.title || q,
          url: gif.url || "",
          preview: preview.url || gif.url || "",
        };
      }).filter((g) => g.url);
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
      const gifs = results.map((item) => ({
        id: String(item.id),
        title: item.title || q,
        url: item.images?.original?.url || item.images?.downsized?.url || "",
        preview: item.images?.fixed_height_small?.url || item.images?.preview_gif?.url || "",
      })).filter((g) => g.url);
      return res.status(200).json({ gifs, source: "giphy" });
    }

    // No API key — curated + filter by query
    const needle = q.toLowerCase();
    let gifs = CURATED.filter(
      (g) => !needle || g.title.toLowerCase().includes(needle) || needle === "hello"
    );
    if (!gifs.length) gifs = CURATED;
    return res.status(200).json({
      gifs,
      source: "curated",
      hint: "Set TENOR_API_KEY or GIPHY_API_KEY on Vercel for full GIF search",
    });
  } catch (error) {
    console.error("Gifs API error:", error);
    return res.status(500).json({ error: error.message || "Failed", gifs: FALLBACK });
  }
}
