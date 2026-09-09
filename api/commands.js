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
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || "Not authenticated" });
    }

    const guildId = String(req.query?.guildId || "");
    const secret = process.env.DASHBOARD_API_SECRET || "";

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      if (!secret) return res.status(500).json({ error: "Missing DASHBOARD_API_SECRET" });
      const payload = {
        guildId: body.guildId || guildId,
        channelId: body.channelId,
        command: body.command || body.name,
        options: body.options || {},
        content: body.content,
        userId: body.userId,
      };
      const tryUrls = [
        `${RAILWAY_API}/api/commands/run`,
        `${RAILWAY_API}/api/commands/execute`,
        `${RAILWAY_API}/api/slash`,
        `${RAILWAY_API}/api/guild/${payload.guildId}/commands/run`,
      ];
      for (const url of tryUrls) {
        try {
          const response = await fetchWithTimeout(
            url,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
              cache: "no-store",
            },
            15000
          );
          const data = await response.json().catch(() => ({}));
          if (response.ok) return res.status(200).json({ ok: true, data, via: url });
        } catch (_) {}
      }
      return res.status(501).json({
        error:
          "Bot has no command runner endpoint yet. Message was not executed as an interaction. Send as text or add /api/commands/run on the bot.",
        fallback: true,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const [discordCmds, railwayCmds] = await Promise.all([
      fromDiscord(guildId).catch(() => []),
      fromRailway(guildId, secret).catch(() => []),
    ]);

    const byName = new Map();
    for (const c of [...railwayCmds, ...discordCmds]) {
      if (!c || !c.name) continue;
      if (!byName.has(c.name)) byName.set(c.name, c);
    }
    const commands = Array.from(byName.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return res.status(200).json({
      commands,
      total: commands.length,
      note:
        "Discord only allows listing *your* bot application commands. Other bots' slash commands are not available via the public API.",
    });
  } catch (error) {
    console.error("Commands API error:", error);
    return res.status(500).json({ error: error.message || "Failed" });
  }
}
