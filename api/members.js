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
    const ext = String(user.avatar).startsWith("a_") ? "gif" : "png";
    avatar = `https://cdn.discordapp.com/avatars/${id}/${user.avatar}.${ext}?size=64`;
  } else if (id) {
    let n = 0;
    try {
      const digits = String(id).replace(/\D/g, "");
      n = Number(digits.slice(-2) || "0") % 6;
    } catch (_) {
      n = 0;
    }
    avatar = "https://cdn.discordapp.com/embed/avatars/" + n + ".png";
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

function normalizeStatus(s) {
  if (s == null || s === "") return null;
  const v = String(s).toLowerCase();
  if (["online", "idle", "dnd", "offline", "invisible"].includes(v)) {
    return v === "invisible" ? "offline" : v;
  }
  return null;
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

  const pageSize = Math.min(1000, Math.max(1, limit));
  let after = "0";
  const all = [];
  let pages = 0;

  while (all.length < limit && pages < 10) {
    pages += 1;
    const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members`);
    url.searchParams.set("limit", String(pageSize));
    if (after && after !== "0") url.searchParams.set("after", after);

    const res = await fetchWithTimeout(
      url.toString(),
      {
        headers: { Authorization: `Bot ${token}` },
        cache: "no-store",
      },
      12000
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `Discord members API ${res.status}: ${errText.slice(0, 180) || res.statusText}`
      );
    }

    const data = await res.json();
    if (!Array.isArray(data) || !data.length) break;

    for (const raw of data) {
      const m = mapDiscordMember(raw);
      if (m.id) all.push(m);
    }

    const last = data[data.length - 1];
    const lastId = last?.user?.id;
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

  if (members.length > limit) members = members.slice(0, limit);

  return {
    members,
    total: members.length,
    source: "discord-api",
    fetchError: null,
    truncated: all.length >= limit,
    pages,
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
    12000
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Bot returned ${res.status}`);
  }
  return data;
}

async function presenceMapFromRailway(guildId, dashboardSecret) {
  if (!dashboardSecret) return {};
  const paths = [
    `${RAILWAY_API}/api/guild/${guildId}/presence`,
    `${RAILWAY_API}/api/guild/${guildId}/members/presence`,
    `${RAILWAY_API}/api/presence?guildId=${encodeURIComponent(guildId)}`,
  ];
  const map = {};
  for (const url of paths) {
    try {
      const res = await fetchWithTimeout(
        url,
        { headers: { Authorization: `Bearer ${dashboardSecret}` }, cache: "no-store" },
        8000
      );
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      if (!data) continue;
      if (data.presence && typeof data.presence === "object" && !Array.isArray(data.presence)) {
        for (const [id, st] of Object.entries(data.presence)) {
          const n = normalizeStatus(typeof st === "object" ? st.status : st);
          if (n) map[String(id)] = n;
        }
        if (Object.keys(map).length) return map;
      }
      const list = data.statuses || data.members || data.users || (Array.isArray(data) ? data : null);
      if (Array.isArray(list)) {
        for (const row of list) {
          if (!row) continue;
          const id = String(row.id || row.userId || row.user_id || (row.user && row.user.id) || "");
          const n = normalizeStatus(row.status || row.presence || row.state);
          if (id && n) map[id] = n;
        }
        if (Object.keys(map).length) return map;
      }
    } catch (_) {}
  }
  return map;
}

function mergeStatusIntoMembers(payload, statusMap) {
  if (!payload || !Array.isArray(payload.members) || !statusMap) return payload;
  let hits = 0;
  for (const m of payload.members) {
    if (!m || !m.id) continue;
    const st = statusMap[String(m.id)];
    if (st) {
      m.status = st;
      hits += 1;
    }
    // unknown stays null — UI groups by hoisted role
  }
  payload.presenceHits = hits;
  payload.presenceTotal = Object.keys(statusMap).length;
  return payload;
}

function mergeRailwayMemberStatuses(discordPayload, railwayPayload) {
  if (!discordPayload || !Array.isArray(discordPayload.members)) return discordPayload;
  if (!railwayPayload || !Array.isArray(railwayPayload.members)) return discordPayload;
  const byId = {};
  for (const m of railwayPayload.members) {
    if (!m || !m.id) continue;
    const st = normalizeStatus(m.status || m.presence);
    if (st) byId[String(m.id)] = st;
  }
  if (!Object.keys(byId).length) return discordPayload;
  return mergeStatusIntoMembers(discordPayload, byId);
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
    const dashboardSecret = process.env.DASHBOARD_API_SECRET || "";

    let payload = null;

    try {
      const direct = await fromDiscordApi(guildId, limit, q);
      if (direct) payload = direct;
      else errors.push("discord: no bot token on website");
    } catch (err) {
      errors.push("discord: " + (err.message || String(err)));
      console.warn("[members] Discord API:", err.message || err);
    }

    if (!payload && dashboardSecret) {
      try {
        payload = await fromRailway(guildId, limit, q, dashboardSecret);
      } catch (err) {
        errors.push("railway: " + (err.message || String(err)));
      }
    }

    if (!payload) {
      return res.status(504).json({
        error:
          "Could not load members. Set DISCORD_BOT_TOKEN on Vercel + Server Members Intent.",
        errors,
      });
    }

    if (dashboardSecret) {
      try {
        const railwayMembers = await fromRailway(guildId, limit, q, dashboardSecret).catch(
          () => null
        );
        if (railwayMembers) {
          payload = mergeRailwayMemberStatuses(payload, railwayMembers);
          if (payload.source === "discord-api") payload.source = "discord+railway-status";
        }
      } catch (_) {}

      try {
        const pmap = await presenceMapFromRailway(guildId, dashboardSecret);
        if (Object.keys(pmap).length) {
          payload = mergeStatusIntoMembers(payload, pmap);
          payload.source = (payload.source || "discord") + "+presence";
        }
      } catch (_) {}
    }

    if (errors.length) payload.errors = errors;
    return res.status(200).json(payload);
  } catch (error) {
    console.error("Members API error:", error);
    return res.status(500).json({
      error: error.message || "Failed to load members",
    });
  }
}
