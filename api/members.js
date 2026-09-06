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

function mapDiscordMember(raw) {
  const user = raw.user || {};
  const id = String(user.id || "");
  let avatar = null;
  if (user.avatar && id) {
    avatar = `https://cdn.discordapp.com/avatars/${id}/${user.avatar}.png?size=64`;
  } else if (id) {
    const idx = Number(String(id).replace(/\D/g, "").slice(-2) || "0") % 6;
    avatar = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  }
  return {
    id,
    username: user.username || null,
    globalName: user.global_name || null,
    displayName: raw.nick || user.global_name || user.username || "Unknown",
    bot: !!user.bot,
    avatar,
    status: null,
  };
}

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fromDiscordApi(guildId, limit, q) {
  const token = botToken();
  if (!token) return null;

  const res = await fetchWithTimeout(
    `https://discord.com/api/v10/guilds/${guildId}/members?limit=${limit}`,
    {
      headers: {
        Authorization: `Bot ${token}`,
      },
      cache: "no-store",
    },
    10000
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Discord members API ${res.status}: ${errText.slice(0, 160) || res.statusText}`
    );
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Discord returned unexpected members payload");
  }

  let members = data.map(mapDiscordMember).filter((m) => m.id);

  if (q) {
    const needle = q.toLowerCase();
    members = members.filter((m) => {
      return (
        (m.displayName || "").toLowerCase().includes(needle) ||
        (m.username || "").toLowerCase().includes(needle) ||
        (m.globalName || "").toLowerCase().includes(needle) ||
        (m.id || "").includes(needle)
      );
    });
  }

  members.sort((a, b) =>
    String(a.displayName || "").localeCompare(String(b.displayName || ""), undefined, {
      sensitivity: "base",
    })
  );

  return {
    members,
    total: members.length,
    source: "discord-api",
    fetchError: null,
    truncated: data.length >= limit,
  };
}

async function fromRailway(guildId, limit, q, dashboardSecret) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (q) params.set("q", q);

  const res = await fetchWithTimeout(
    `${RAILWAY_API}/api/guild/${guildId}/members?${params}`,
    {
      headers: { Authorization: `Bearer ${dashboardSecret}` },
      cache: "no-store",
    },
    10000
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Bot returned ${res.status}`);
  }
  return data;
}

export default async function handler(req, res) {
  try {
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({
        error: err.message || "Not authenticated",
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const guildId = req.query?.guildId;
    if (!guildId) {
      return res.status(400).json({ error: "Missing guildId" });
    }

    let limit = parseInt(String(req.query.limit || "150"), 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 150;
    if (limit > 1000) limit = 1000;
    const q = String(req.query.q || "").trim();

    const errors = [];

    try {
      const direct = await fromDiscordApi(guildId, limit, q);
      if (direct) {
        return res.status(200).json(direct);
      }
    } catch (err) {
      errors.push("discord: " + (err.message || String(err)));
      console.warn("[members] Discord API:", err.message || err);
    }

    const dashboardSecret = process.env.DASHBOARD_API_SECRET;
    if (!dashboardSecret) {
      return res.status(500).json({
        error:
          "Set DISCORD_BOT_TOKEN (or BOT_TOKEN) on Vercel to the same token as the Discord bot.",
        errors,
      });
    }

    try {
      const data = await fromRailway(guildId, limit, q, dashboardSecret);
      return res.status(200).json(data);
    } catch (err) {
      errors.push("railway: " + (err.message || String(err)));
      const timedOut = err.name === "AbortError";
      return res.status(504).json({
        error: timedOut
          ? "Timed out talking to the bot. Add DISCORD_BOT_TOKEN on Vercel (same as Railway bot token) to load members directly from Discord."
          : err.message || "Failed to load members",
        errors,
      });
    }
  } catch (error) {
    console.error("Members API error:", error);
    return res.status(500).json({
      error: error.message || "Failed to load members",
    });
  }
}
