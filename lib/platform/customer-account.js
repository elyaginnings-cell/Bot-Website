import { query } from "../db.js";
import { requireCustomerAccount } from "../customerAuth.js";
import { getAccountPlan } from "../subscriptions.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    const customer = await requireCustomerAccount(req);
    const [plan, storage, servers, subscription, invoices] = await Promise.all([
      getAccountPlan(customer.account.id),
      query("SELECT used_bytes, updated_at FROM account_storage_usage WHERE account_id = $1", [customer.account.id]),
      query("SELECT guild_id, guild_name, access_level, verified_at FROM customer_servers WHERE account_id = $1 ORDER BY guild_name", [customer.account.id]),
      query(
        `SELECT status, payment_status, billing_interval, current_period_start,
                current_period_end, cancel_at_period_end, canceled_at, billing_mode
         FROM account_subscriptions WHERE account_id = $1 LIMIT 1`,
        [customer.account.id]
      ),
      query(
        `SELECT stripe_invoice_id, status, amount_due_cents, amount_paid_cents,
                currency, hosted_invoice_url, invoice_pdf, created_at
         FROM billing_invoices WHERE account_id = $1
         ORDER BY created_at DESC LIMIT 20`,
        [customer.account.id]
      ),
    ]);
    const usedBytes = Number(storage.rows[0]?.used_bytes || 0);
    const limitBytes = plan.storageLimitBytes;
    return res.status(200).json({
      account: {
        id: customer.account.id,
        email: customer.account.email,
        username: customer.account.global_name || customer.account.username,
        discordId: customer.account.discord_id,
        websiteOwner: customer.isOwner,
      },
      plan,
      subscription: subscription.rows[0] || null,
      storage: {
        usedBytes,
        limitBytes,
        remainingBytes: limitBytes === null ? null : Math.max(0, limitBytes - usedBytes),
        updatedAt: storage.rows[0]?.updated_at || null,
      },
      servers: servers.rows,
      invoices: invoices.rows,
    });
  } catch (error) {
    console.error("Customer account API error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Could not load customer account.",
      code: error.code || undefined,
    });
  }
}
