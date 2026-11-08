import { query } from "../lib/db.js";
import { requireWebsiteOwner } from "../lib/customerAuth.js";

export default async function handler(req, res) {
  try {
    await requireWebsiteOwner(req);
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    const result = await query(
      `SELECT a.id AS account_id, a.email, a.discord_id, a.username, a.global_name,
              a.created_at AS account_created_at,
              s.plan_id, s.status AS subscription_status, s.payment_status,
              s.billing_interval, s.billing_mode, s.current_period_end,
              s.cancel_at_period_end,
              COALESCE(u.used_bytes, 0)::text AS used_bytes,
              COALESCE(json_agg(
                DISTINCT jsonb_build_object(
                  'guildId', cs.guild_id,
                  'guildName', cs.guild_name,
                  'accessLevel', cs.access_level
                )
              ) FILTER (WHERE cs.guild_id IS NOT NULL), '[]'::json) AS servers
       FROM accounts a
       LEFT JOIN account_subscriptions s ON s.account_id = a.id
       LEFT JOIN account_storage_usage u ON u.account_id = a.id
       LEFT JOIN customer_servers cs ON cs.account_id = a.id
       GROUP BY a.id, s.plan_id, s.status, s.payment_status, s.billing_interval,
                s.billing_mode, s.current_period_end, s.cancel_at_period_end, u.used_bytes
       ORDER BY a.created_at DESC
       LIMIT 250`
    );
    return res.status(200).json({ customers: result.rows });
  } catch (error) {
    console.error("Owner customers API error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Could not load customer accounts.",
      code: error.code || undefined,
    });
  }
}
