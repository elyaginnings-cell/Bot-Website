import { requireAnySession } from "../lib/requireAuth.js";
import { findById } from "../lib/accounts.js";

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

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function mapCommand(c, source) {
  if (!c) return null;
  const name = c.name || c.command || "";
  if (!name) return null;
  return {
    name: String(name),
    desc: c.description || c.desc || "",
    id: c.id ? String(c.id) : null,
    type: c.type || 1,
    options: Array.isArray(c.options) ? c.options : [],
    source: source || "unknown",
  };
}

async function fromDiscord(guildId) {
  const token = botToken();
  if (!token) return [];
  const appRes = await fetchWithTimeout("https://discord.com/api/v10/oauth2/applications/@me", {
    headers: { Authorization: `Bot ${token}` },
    cache: "no-store",
  }, 8000);
  if (!appRes.ok) return [];
  const app = await appRes.json().catch(() => ({}));
  const appId = app.id;
  if (!appId) return [];

  const out = [];
  const seen = new Set();

  async function pull(url, source) {
    try {
      const res = await fetchWithTimeout(url, {
        headers: { Authorization: `Bot ${token}` },
        cache: "no-store",
      }, 10000);
      if (!res.ok) return;
      const data = await res.json().catch(() => []);
      const list = Array.isArray(data) ? data : [];
      for (const c of list) {
        const m = mapCommand(c, source);
        if (!m || seen.has(m.name)) continue;
        seen.add(m.name);
        out.push(m);
      }
    } catch (_) {}
  }

  await pull(`https://discord.com/api/v10/applications/${appId}/commands`, "global");
  if (guildId) {
    await pull(
      `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`,
      "guild"
    );
  }
  return out;
}

async function fromRailway(guildId, secret) {
  if (!secret) return [];
  const urls = [
    `${RAILWAY_API}/api/commands?guildId=${encodeURIComponent(guildId || "")}`,
    `${RAILWAY_API}/api/guild/${guildId}/commands`,
    `${RAILWAY_API}/api/commands`,
  ];
  const out = [];
  const seen = new Set();
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(
        url,
        { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" },
        8000
      );
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      if (!data) continue;
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.commands)
          ? data.commands
          : Array.isArray(data.slash)
            ? data.slash
            : [];
      for (const c of list) {
        const m = mapCommand(c, "railway");
        if (!m || seen.has(m.name)) continue;
        seen.add(m.name);
        out.push(m);
      }
      if (out.length) break;
    } catch (_) {}
  }
  return out;
}

export default async function handler(req, res) {
  try {
    let session;
    try {
      session = requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || "Not authenticated" });
    }

    const guildId = String(req.query?.guildId || "");
    const secret = process.env.DASHBOARD_API_SECRET || "";

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      if (!secret) return res.status(500).json({ error: "Missing DASHBOARD_API_SECRET" });
      const account = session?.accountId ? await findById(session.accountId) : null;
      const payload = {
        guildId: body.guildId || guildId,
        channelId: body.channelId,
        command: body.command || body.name,
        options: body.options || {},
        content: body.content,
        userId: session?.discordId || account?.discord_id || null,
      };
      const response = await fetchWithTimeout(
        RAILWAY_API + "/api/commands/run",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + secret,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          cache: "no-store",
        },
        30000
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({
          error: data.error || "Coffee Shop could not run that command.",
          details: data.details || null,
        });
      }
      return res.status(200).json({ ok: true, data, via: "coffee-shop-bot" });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const railwayCmds = await fromRailway(guildId, secret).catch(() => []);

    const commands = railwayCmds.sort((a, b) => a.name.localeCompare(b.name));
    return res.status(200).json({
      commands,
      total: commands.length,
      source: "coffee-shop-bot",
      note: "Only commands registered by the Coffee Shop bot are shown here.",
    });
  } catch (error) {
    console.error("Commands API error:", error);
    return res.status(500).json({ error: error.message || "Failed" });
  }
}
