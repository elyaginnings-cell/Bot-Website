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

function defaultAvatar(id) {
  let n = 0;
  try {
    const digits = String(id).replace(/\D/g, "");
    n = Number(digits.slice(-2) || "0") % 6;
  } catch (_) {
    n = 0;
  }
  return "https://cdn.discordapp.com/embed/avatars/" + n + ".png";
}

function mapDiscordMember(raw) {
  const user = raw.user || {};
  const id = String(user.id || "");
  let avatar = null;
  if (user.avatar && id) {
    const ext = String(user.avatar).startsWith("a_") ? "gif" : "png";
    avatar = `https://cdn.discordapp.com/avatars/${id}/${user.avatar}.${ext}?size=64`;
  } else if (id) {
    avatar = defaultAvatar(id);
  }
  return {
    id,
    username: user.username || null,
    globalName: user.global_name || null,
    displayName: raw.nick || user.global_name || user.username || "Unknown",
    bot: !!user.bot,
    avatar,
    roleIds: Array.isArray(raw.roles) ? raw.roles.map(String) : [],
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

function intentOrTokenError(status, bodyText) {
  const text = String(bodyText || "").toLowerCase();
  if (status === 401 || text.includes("unauthorized") || text.includes("invalid token")) {
    return "Invalid or missing DISCORD_BOT_TOKEN on Vercel. Set the same bot token as Railway, then redeploy.";
  }
  if (
    status === 403 ||
    text.includes("missing access") ||
    text.includes("privileged") ||
    text.includes("disallowed intent") ||
    text.includes("intent")
  ) {
    return "Server Members Intent is disabled. Discord Developer Portal → Bot → enable Server Members Intent, save, then hard-refresh.";
  }
  return null;
}

/**
 * Paginate Discord guild members.
 * Discord allows max 1000 per request; we use 100/page and walk with `after`.
 */
async function fromDiscordApi(guildId, limit, q) {
  const token = botToken();
  if (!token) return null;

  const pageSize = 100; // Discord-friendly page size
  let after = "0";
  const all = [];
  let pages = 0;
  const maxPages = Math.ceil(Math.min(limit, 1000) / pageSize) + 1;

  while (all.length < limit && pages < maxPages) {
    pages += 1;
    const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members`);
    url.searchParams.set("limit", String(pageSize));
    if (after && after !== "0") url.searchParams.set("after", after);

    const res = await fetchWithTimeout(
      url.toString(),
      { headers: { Authorization: `Bot ${token}` }, cache: "no-store" },
      12000
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const friendly = intentOrTokenError(res.status, errText);
      throw new Error(
        friendly || `Discord members API ${res.status}: ${errText.slice(0, 160)}`
      );
    }

    const data = await res.json();
    if (!Array.isArray(data) || !data.length) break;

    for (const raw of data) {
      const m = mapDiscordMember(raw);
      if (m.id) all.push(m);
    }

    const lastId = data[data.length - 1]?.user?.id;
    if (!lastId || data.length < pageSize) break;
    after = String(lastId);
  }

  let members = all;
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

  const truncated = all.length >= limit;
  if (members.length > limit) members = members.slice(0, limit);

  return {
    members,
    total: members.length,
    source: "discord-api",
    pages,
    truncated,
  };
}

async function fromRailway(guildId, limit, q, dashboardSecret) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (q) params.set("q", q);
  const res = await fetchWithTimeout(
    `${RAILWAY_API}/api/guild/${guildId}/members?${params}`,
    { headers: { Authorization: `Bearer ${dashboardSecret}` }, cache: "no-store" },
    12000
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Bot returned ${res.status}`);
  return data;
}

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

    const guildId = req.query?.guildId;
    if (!guildId) return res.status(400).json({ error: "Missing guildId" });

    let limit = parseInt(String(req.query.limit || "200"), 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 200;
    if (limit > 1000) limit = 1000;
    const q = String(req.query.q || "").trim();
    const errors = [];

    const token = botToken();
    if (!token) {
      errors.push("discord: no bot token");
    } else {
      try {
        const direct = await fromDiscordApi(guildId, limit, q);
        if (direct) return res.status(200).json(direct);
      } catch (err) {
        errors.push("discord: " + (err.message || String(err)));
        // If it's clearly a token/intent problem, return that directly
        const msg = err.message || "";
        if (
          msg.includes("DISCORD_BOT_TOKEN") ||
          msg.includes("Server Members Intent") ||
          msg.includes("Invalid or missing")
        ) {
          return res.status(403).json({
            error: msg,
            errors,
          });
        }
      }
    }

    const dashboardSecret = process.env.DASHBOARD_API_SECRET;
    if (!dashboardSecret) {
      return res.status(500).json({
        error:
          "Set DISCORD_BOT_TOKEN on Vercel (same token as the Railway bot), enable Server Members Intent in the Discord Developer Portal, then redeploy.",
        errors,
      });
    }

    try {
      const data = await fromRailway(guildId, limit, q, dashboardSecret);
      return res.status(200).json(data);
    } catch (err) {
      errors.push("railway: " + (err.message || String(err)));
      return res.status(502).json({
        error:
          err.message ||
          "Failed to load members. Check DISCORD_BOT_TOKEN and Server Members Intent.",
        errors,
      });
    }
  } catch (error) {
    console.error("Members API error:", error);
    return res.status(500).json({ error: error.message || "Failed to load members" });
  }
}
