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
    const err = new Error(data.message || `Discord API ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export default async function handler(req, res) {
  try {
    try {
      requireAnySession(req);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || "Not authenticated" });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const guildId = String(req.query?.guildId || body.guildId || "").trim();
    if (!guildId) return res.status(400).json({ error: "Missing guildId" });

    const action = String(body.action || "").toLowerCase();

    if (action === "create") {
      const name = String(body.name || "").trim().slice(0, 100);
      if (!name) return res.status(400).json({ error: "Role name required" });
      const created = await discord(`/guilds/${guildId}/roles`, {
        method: "POST",
        body: {
          name,
          color: body.color != null ? Number(body.color) : 0,
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
  } catch (error) {
    console.error("[role-manage]", error.message || error);
    return res.status(error.status || 500).json({
      error: error.message || "Role action failed",
      detail: error.data || null,
    });
  }
}
