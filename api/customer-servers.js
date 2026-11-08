import { query } from "../lib/db.js";
import { requireCustomerAccount, getDiscordGuildPermissions } from "../lib/customerAuth.js";
import { getAccountPlan } from "../lib/subscriptions.js";

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch {}
  }
  return {};
}

export default async function handler(req, res) {
  try {
    const customer = await requireCustomerAccount(req);

    if (req.method === "GET") {
      const rows = await query(
        `SELECT guild_id, guild_name, access_level, verified_at, connected_at
         FROM customer_servers WHERE account_id = $1
         ORDER BY guild_name ASC`,
        [customer.account.id]
      );
      let discordGuilds = [];
      let discordConnected = Boolean(customer.session.discordToken);
      if (discordConnected) {
        try {
          discordGuilds = await getDiscordGuildPermissions(customer.session.discordToken);
        } catch (error) {
          if (error.code === "DISCORD_SESSION_EXPIRED" || error.code === "DISCORD_NOT_LINKED") discordConnected = false;
          else throw error;
        }
      }
      const manageableGuilds = discordGuilds.filter((guild) => guild.canManage);
      const liveById = new Map(manageableGuilds.map((guild) => [guild.id, guild]));
      const servers = rows.rows.map((server) => {
        const live = liveById.get(server.guild_id);
        return {
          ...server,
          permissionValid: Boolean(live),
          accessLevel: live?.accessLevel || server.access_level,
          guildName: live?.name || server.guild_name,
        };
      });
      const connectedIds = new Set(rows.rows.map((server) => server.guild_id));
      return res.status(200).json({
        servers,
        availableServers: manageableGuilds.filter((guild) => !connectedIds.has(guild.id)),
        discordConnected,
      });
    }

    if (req.method === "POST") {
      const body = readBody(req);
      const guildId = String(body.guildId || "").trim();
      if (!/^\d{15,22}$/.test(guildId)) {
        return res.status(400).json({ error: "A valid Discord server ID is required." });
      }

      const guilds = await getDiscordGuildPermissions(customer.session.discordToken);
      const guild = guilds.find((item) => item.id === guildId);
      if (!guild?.canManage) {
        return res.status(403).json({
          error: "Discord does not show that your account owns or manages this server.",
          code: "DISCORD_SERVER_PERMISSION_REQUIRED",
        });
      }

      const current = await query(
        "SELECT account_id, access_level FROM customer_servers WHERE guild_id = $1",
        [guildId]
      );
      const existing = current.rows[0];

      if (existing && existing.account_id !== customer.account.id && !guild.owner && !customer.isOwner) {
        return res.status(409).json({
          error: "This server is already connected to another customer account. Only the verified Discord server owner can transfer it.",
          code: "SERVER_ALREADY_CLAIMED",
        });
      }

      const plan = await getAccountPlan(customer.account.id);
      const count = await query(
        "SELECT COUNT(*)::int AS total FROM customer_servers WHERE account_id = $1 AND guild_id <> $2",
        [customer.account.id, guildId]
      );
      const alreadyOwned = existing?.account_id === customer.account.id;
      if (!alreadyOwned && plan.serverLimit !== null && count.rows[0].total >= plan.serverLimit) {
        return res.status(402).json({
          error: "Your current plan has reached its connected-server limit.",
          code: "SERVER_LIMIT_REACHED",
          limit: plan.serverLimit,
          plan: plan.id,
        });
      }

      const transferred = Boolean(existing && existing.account_id !== customer.account.id);
      await query(
        `INSERT INTO customer_servers
          (account_id, guild_id, guild_name, discord_user_id, access_level, verified_at, transferred_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW(),CASE WHEN $6 THEN NOW() ELSE NULL END,NOW())
         ON CONFLICT (guild_id) DO UPDATE SET
           account_id = EXCLUDED.account_id,
           guild_name = EXCLUDED.guild_name,
           discord_user_id = EXCLUDED.discord_user_id,
           access_level = EXCLUDED.access_level,
           verified_at = NOW(),
           transferred_at = CASE WHEN customer_servers.account_id <> EXCLUDED.account_id THEN NOW() ELSE customer_servers.transferred_at END,
           updated_at = NOW()`,
        [customer.account.id, guild.id, guild.name, customer.account.discord_id, guild.accessLevel, transferred]
      );

      if (transferred) {
        await query(
          `INSERT INTO owner_audit_log (actor_account_id, action, target_account_id, target_guild_id, details)
           VALUES ($1, 'server_ownership_transfer', $2, $3, $4::jsonb)`,
          [customer.account.id, existing.account_id, guild.id, JSON.stringify({ accessLevel: guild.accessLevel })]
        );
      }

      return res.status(200).json({
        ok: true,
        server: { id: guild.id, name: guild.name, accessLevel: guild.accessLevel },
        transferred,
      });
    }

    if (req.method === "DELETE") {
      const guildId = String(req.query?.guildId || "").trim();
      if (!/^\d{15,22}$/.test(guildId)) return res.status(400).json({ error: "A valid Discord server ID is required." });
      const removed = await query(
        "DELETE FROM customer_servers WHERE account_id = $1 AND guild_id = $2 RETURNING guild_id",
        [customer.account.id, guildId]
      );
      if (!removed.rowCount) return res.status(404).json({ error: "That server is not connected to your account." });
      return res.status(200).json({ ok: true, disconnected: guildId });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Customer servers API error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Could not manage connected servers.",
      code: error.code || undefined,
    });
  }
}
