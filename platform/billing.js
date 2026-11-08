import { query } from "../lib/db.js";
import { requireCustomerAccount } from "../lib/customerAuth.js";
import {
  ensureStripeCustomer,
  ensureStripePrice,
  loadPlan,
  stripeRequest,
} from "../lib/stripe.js";

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch {}
  }
  return {};
}

function appUrl() {
  const configured = String(process.env.APP_URL || "").trim();
  const deployment = String(process.env.VERCEL_URL || "").trim();
  const value = configured || (deployment ? "https://" + deployment : "");
  if (!value) {
    const error = new Error("Set APP_URL on Vercel before enabling billing redirects.");
    error.status = 503;
    error.code = "APP_URL_NOT_CONFIGURED";
    throw error;
  }
  return value.replace(/\/$/, "");
}

async function getOwnedSubscription(accountId) {
  const result = await query(
    `SELECT s.*, p.monthly_price_cents, p.currency
     FROM account_subscriptions s
     JOIN subscription_plans p ON p.id = s.plan_id
     WHERE s.account_id = $1 LIMIT 1`,
    [accountId]
  );
  return result.rows[0] || null;
}

export default async function handler(req, res) {
  try {
    const customer = await requireCustomerAccount(req);
    if (req.method === "GET") {
      const [plans, subscription, invoices] = await Promise.all([
        query("SELECT * FROM subscription_plans WHERE is_active = TRUE AND is_public = TRUE ORDER BY sort_order, monthly_price_cents"),
        getOwnedSubscription(customer.account.id),
        query(
          "SELECT stripe_invoice_id, status, amount_due_cents, amount_paid_cents, currency, hosted_invoice_url, invoice_pdf, created_at FROM billing_invoices WHERE account_id = $1 ORDER BY created_at DESC LIMIT 20",
          [customer.account.id]
        ),
      ]);
      return res.status(200).json({ plans: plans.rows, subscription, invoices: invoices.rows });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const body = readBody(req);
    const action = String(body.action || "");
    const baseUrl = appUrl();

    if (action === "checkout") {
      const plan = await loadPlan(String(body.planId || ""));
      if (!plan || plan.id === "free" || Number(plan.monthly_price_cents) <= 0) {
        return res.status(400).json({ error: "Choose an available paid subscription plan." });
      }
      const interval = body.interval === "year" ? "year" : "month";
      const current = await getOwnedSubscription(customer.account.id);
      if (current && ["active", "trialing", "past_due"].includes(current.status)) {
        return res.status(409).json({ error: "An existing subscription must be changed or canceled instead of starting another checkout." });
      }
      const stripeCustomerId = await ensureStripeCustomer(customer.account);
      const priceId = await ensureStripePrice(plan, interval);
      const session = await stripeRequest("checkout/sessions", {
        method: "POST",
        idempotencyKey: "checkout-" + customer.account.id + "-" + plan.id + "-" + interval + "-" + Date.now(),
        params: {
          mode: "subscription",
          customer: stripeCustomerId,
          "line_items[0][price]": priceId,
          "line_items[0][quantity]": 1,
          success_url: baseUrl + "/?billing=success",
          cancel_url: baseUrl + "/?billing=cancel",
          client_reference_id: customer.account.id,
          "metadata[account_id]": customer.account.id,
          "metadata[plan_id]": plan.id,
          "metadata[billing_interval]": interval,
          "subscription_data[metadata][account_id]": customer.account.id,
          "subscription_data[metadata][plan_id]": plan.id,
          "subscription_data[metadata][billing_interval]": interval,
        },
      });
      return res.status(200).json({ checkoutUrl: session.url, sessionId: session.id });
    }

    if (action === "portal") {
      const customerRow = await query(
        "SELECT stripe_customer_id FROM billing_customers WHERE account_id = $1",
        [customer.account.id]
      );
      if (!customerRow.rows[0]) return res.status(404).json({ error: "No billing profile exists yet." });
      const portal = await stripeRequest("billing_portal/sessions", {
        method: "POST",
        params: {
          customer: customerRow.rows[0].stripe_customer_id,
          return_url: baseUrl + "/?billing=return",
        },
      });
      return res.status(200).json({ portalUrl: portal.url });
    }

    if (action === "cancel" || action === "resume") {
      const current = await getOwnedSubscription(customer.account.id);
      if (!current?.stripe_subscription_id) return res.status(404).json({ error: "No active subscription was found." });
      const updated = await stripeRequest("subscriptions/" + current.stripe_subscription_id, {
        method: "POST",
        params: { cancel_at_period_end: action === "cancel" ? "true" : "false" },
      });
      return res.status(200).json({
        ok: true,
        cancelAtPeriodEnd: Boolean(updated.cancel_at_period_end),
        currentPeriodEnd: updated.current_period_end || null,
      });
    }

    if (action === "change-plan") {
      const current = await getOwnedSubscription(customer.account.id);
      if (!current?.stripe_subscription_id) return res.status(404).json({ error: "No active subscription was found." });
      const target = await loadPlan(String(body.planId || ""));
      if (!target || target.id === "free" || Number(target.monthly_price_cents) <= 0) {
        return res.status(400).json({ error: "Choose an available paid plan." });
      }
      const interval = body.interval === "year" ? "year" : "month";
      const priceId = await ensureStripePrice(target, interval);
      const stripeSubscription = await stripeRequest("subscriptions/" + current.stripe_subscription_id);
      const itemId = stripeSubscription.items?.data?.[0]?.id;
      if (!itemId) return res.status(409).json({ error: "Stripe did not return a subscription item to update." });
      const upgrade = Number(target.monthly_price_cents) > Number(current.monthly_price_cents);
      const updated = await stripeRequest("subscriptions/" + current.stripe_subscription_id, {
        method: "POST",
        params: {
          "items[0][id]": itemId,
          "items[0][price]": priceId,
          proration_behavior: upgrade ? "create_prorations" : "none",
          payment_behavior: "pending_if_incomplete",
        },
      });
      return res.status(200).json({
        ok: true,
        change: upgrade ? "upgrade" : "downgrade",
        prorationBehavior: upgrade ? "create_prorations" : "none",
        subscriptionStatus: updated.status,
      });
    }

    return res.status(400).json({ error: "Unknown billing action." });
  } catch (error) {
    console.error("Billing API error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Billing request failed.",
      code: error.code || undefined,
    });
  }
}
