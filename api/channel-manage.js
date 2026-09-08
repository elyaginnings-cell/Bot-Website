import { requireAnySession } from "../lib/requireAuth.js";

function botToken() {
  return (
    process.env.DISCORD_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.DISCORD_TOKEN ||
    ""
  );
}

async function discord(path, { method = "GET", body } = {}) {
  const token = botToken();
  if (!token) {
    const err = new Error("DISCORD_BOT_TOKEN is not set on Vercel");
    err.status = 500;
    throw err;
  }
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  if (!res.ok) {
    const msg =
      data.message ||
      data.error ||
      `Discord API ${res.status}` +
        (Array.isArray(data.errors) ? "" : "");
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(data).slice(0, 200));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function mapChannel(c) {
  if (!c || !c.id) return null;
  return {
    id: String(c.id),
    name: c.name || "channel",
    type: c.type,
    parentId: c.parent_id ? String(c.parent_id) : null,
    position: c.position ?? 0,
  };
}

export default async function handler(req, res) {
  try {
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || "Not authenticated" });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const guildId = String(req.query?.guildId || body.guildId || "").trim();
    if (!guildId) {
      return res.status(400).json({ error: "Missing guildId" });
    }

    // LIST channels (fresh from Discord)
    if (req.method === "GET") {
      const channels = await discord(`/guilds/${guildId}/channels`);
      const list = (Array.isArray(channels) ? channels : [])
        .map(mapChannel)
        .filter(Boolean)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      return res.status(200).json({ channels: list });
    }

    if (req.method === "POST") {
      const action = String(body.action || "create").toLowerCase();

      // CREATE channel or category
      if (action === "create") {
        const name = String(body.name || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9\-_]/g, "")
          .slice(0, 100);
        if (!name) {
          return res.status(400).json({ error: "Channel name is required" });
        }

        // type: 0 = text, 4 = category, 2 = voice (optional)
        let type = Number(body.type);
        if (body.kind === "category") type = 4;
        if (body.kind === "text" || body.kind === "channel") type = 0;
        if (body.kind === "voice") type = 2;
        if (![0, 2, 4, 5].includes(type)) type = 0;

        const payload = { name, type };
        if (type !== 4 && body.parentId) {
          payload.parent_id = String(body.parentId);
        }
        if (body.topic && type === 0) {
          payload.topic = String(body.topic).slice(0, 1024);
        }

        const created = await discord(`/guilds/${guildId}/channels`, {
          method: "POST",
          body: payload,
        });
        return res.status(200).json({ ok: true, channel: mapChannel(created) });
      }

      // DELETE channel / category
      if (action === "delete") {
        const channelId = String(body.channelId || "").trim();
        if (!channelId) {
          return res.status(400).json({ error: "Missing channelId" });
        }
        await discord(`/channels/${channelId}`, { method: "DELETE" });
        return res.status(200).json({ ok: true, deleted: channelId });
      }

      // RENAME
      if (action === "rename") {
        const channelId = String(body.channelId || "").trim();
        let name = String(body.name || "").trim();
        if (!channelId || !name) {
          return res.status(400).json({ error: "Missing channelId or name" });
        }
        // Categories keep spaces; channels Discord-normalize
        if (body.kind !== "category" && Number(body.type) !== 4) {
          name = name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9\-_]/g, "")
            .slice(0, 100);
        } else {
          name = name.slice(0, 100);
        }
        const updated = await discord(`/channels/${channelId}`, {
          method: "PATCH",
          body: { name },
        });
        return res.status(200).json({ ok: true, channel: mapChannel(updated) });
      }

      // MOVE under category (or clear parent)
      if (action === "move") {
        const channelId = String(body.channelId || "").trim();
        if (!channelId) {
          return res.status(400).json({ error: "Missing channelId" });
        }
        const parent_id = body.parentId ? String(body.parentId) : null;
        const updated = await discord(`/channels/${channelId}`, {
          method: "PATCH",
          body: { parent_id },
        });
        return res.status(200).json({ ok: true, channel: mapChannel(updated) });
      }

      return res.status(400).json({ error: "Unknown action. Use create, delete, rename, or move." });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("[channel-manage]", error.message || error);
    return res.status(error.status || 500).json({
      error: error.message || "Channel action failed",
      detail: error.data || null,
    });
  }
}
