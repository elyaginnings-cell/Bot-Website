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
  const text = await res.text().catch(() => "");
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: String(text).slice(0, 200) };
  }
  if (!res.ok) {
    const err = new Error(data.message || `Discord API ${res.status}`);
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

function isRoleManageRequest(req) {
  const url = String(req.url || "");
  const resource = String(req.query?.resource || "");
  return resource === "roles" || url.includes("/role-manage") || url.includes("resource=roles");
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
    if (!guildId) return res.status(400).json({ error: "Missing guildId" });

    // ---- Role manage (merged from api/role-manage.js) ----
    if (isRoleManageRequest(req)) {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const action = String(body.action || "").toLowerCase();

      if (action === "create") {
        const name = String(body.name || "").trim().slice(0, 100);
        if (!name) return res.status(400).json({ error: "Role name required" });
        const created = await discord(`/guilds/${guildId}/roles`, {
          method: "POST",
          body: {
            name,
            color: body.color != null ? Number(body.color) || 0 : 0,
            hoist: !!body.hoist,
            mentionable: body.mentionable !== false,
          },
        });
        return res.status(200).json({ ok: true, role: created });
      }

      if (action === "delete") {
        const roleId = String(body.roleId || "").trim();
        if (!roleId) return res.status(400).json({ error: "Missing roleId" });
        await discord(`/guilds/${guildId}/roles/${roleId}`, { method: "DELETE" });
        return res.status(200).json({ ok: true, deleted: roleId });
      }

      return res.status(400).json({ error: "Unknown action" });
    }

    // ---- Original channel-manage ----
    if (req.method === "GET") {
      const channels = await discord(`/guilds/${guildId}/channels`);
      const list = (Array.isArray(channels) ? channels : [])
        .map(mapChannel)
        .filter(Boolean)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      return res.status(200).json({ channels: list });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const action = String(body.action || "create").toLowerCase();

    if (action === "create") {
      let name = String(body.name || "").trim();
      if (!name) return res.status(400).json({ error: "Channel name is required" });

      let type = Number(body.type);
      if (body.kind === "category") type = 4;
      else if (body.kind === "voice") type = 2;
      else if (body.kind === "text" || body.kind === "channel") type = 0;
      if (![0, 2, 4, 5].includes(type)) type = 0;

      if (type !== 4) {
        name = name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9\-_]/g, "")
          .slice(0, 100);
      } else {
        name = name.slice(0, 100);
      }
      if (!name) return res.status(400).json({ error: "Invalid channel name" });

      const payload = { name, type };
      if (type !== 4 && body.parentId) payload.parent_id = String(body.parentId);

      const created = await discord(`/guilds/${guildId}/channels`, {
        method: "POST",
        body: payload,
      });
      return res.status(200).json({ ok: true, channel: mapChannel(created) });
    }

    if (action === "delete") {
      const channelId = String(body.channelId || "").trim();
      if (!channelId) return res.status(400).json({ error: "Missing channelId" });
      await discord(`/channels/${channelId}`, { method: "DELETE" });
      return res.status(200).json({ ok: true, deleted: channelId });
    }

    if (action === "rename") {
      const channelId = String(body.channelId || "").trim();
      let name = String(body.name || "").trim();
      if (!channelId || !name) return res.status(400).json({ error: "Missing channelId or name" });
      name = name.slice(0, 100);
      const updated = await discord(`/channels/${channelId}`, {
        method: "PATCH",
        body: { name },
      });
      return res.status(200).json({ ok: true, channel: mapChannel(updated) });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (error) {
    console.error("[channel-manage]", error.message || error);
    return res.status(error.status || 500).json({
      error: error.message || "Channel/role action failed",
    });
  }
}
