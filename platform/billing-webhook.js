import { query } from "../lib/db.js";
import { getStripeSecret, verifyStripeSignature } from "../lib/stripe.js";

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  if (typeof req.body === "string") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function accountIdForCustomer(stripeCustomerId, metadataAccountId) {
  if (metadataAccountId) return String(metadataAccountId);
  const result = await query(
    "SELECT account_id FROM billing_customers WHERE stripe_customer_id = $1",
    [stripeCustomerId]
  );
  return result.rows[0]?.account_id || null;
}

async function syncSubscription(subscription, livemode) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const accountId = await accountIdForCustomer(customerId, subscription.metadata?.account_id);
  if (!accountId) throw new Error("Subscription event is not linked to a customer account.");

  const existing = await query(
    "SELECT plan_id FROM account_subscriptions WHERE account_id = $1 OR stripe_subscription_id = $2 LIMIT 1",
    [accountId, subscription.id]
  );
  const planId = subscription.metadata?.plan_id || existing.rows[0]?.plan_id;
  if (!planId) throw new Error("Subscription event is missing its plan ID.");

  const status = subscription.status || "inactive";
  const paymentStatus = status === "active" || status === "trialing"
    ? "paid"
    : status === "past_due" || status === "unpaid"
      ? "failed"
      : "unpaid";

  await query(
    `INSERT INTO account_subscriptions
      (account_id, plan_id, stripe_subscription_id, stripe_customer_id,
       billing_interval, status, payment_status, billing_mode,
       current_period_start, current_period_end, cancel_at_period_end,
       canceled_at, trial_end, latest_invoice_id, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
       CASE WHEN $9::bigint IS NULL THEN NULL ELSE to_timestamp($9::bigint) END,
       CASE WHEN $10::bigint IS NULL THEN NULL ELSE to_timestamp($10::bigint) END,
       $11,
       CASE WHEN $12::bigint IS NULL THEN NULL ELSE to_timestamp($12::bigint) END,
       CASE WHEN $13::bigint IS NULL THEN NULL ELSE to_timestamp($13::bigint) END,
       $14,NOW())
     ON CONFLICT (account_id) DO UPDATE SET
       plan_id = EXCLUDED.plan_id,
       stripe_subscription_id = EXCLUDED.stripe_subscription_id,
       stripe_customer_id = EXCLUDED.stripe_customer_id,
       billing_interval = EXCLUDED.billing_interval,
       status = EXCLUDED.status,
       payment_status = EXCLUDED.payment_status,
       billing_mode = EXCLUDED.billing_mode,
       current_period_start = EXCLUDED.current_period_start,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       canceled_at = EXCLUDED.canceled_at,
       trial_end = EXCLUDED.trial_end,
       latest_invoice_id = EXCLUDED.latest_invoice_id,
       updated_at = NOW()`,
    [
      accountId, planId, subscription.id, customerId,
      subscription.metadata?.billing_interval === "year" ? "year" : "month",
      status, paymentStatus, livemode ? "live" : "test",
      subscription.current_period_start ?? null,
      subscription.current_period_end ?? null,
      Boolean(subscription.cancel_at_period_end),
      subscription.canceled_at ?? null,
      subscription.trial_end ?? null,
      typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice?.id || null,
    ]
  );
}

async function syncInvoice(invoice, successful) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const accountId = await accountIdForCustomer(customerId, invoice.metadata?.account_id);
  if (!accountId) throw new Error("Invoice event is not linked to a customer account.");

  await query(
    `INSERT INTO billing_invoices
      (account_id, stripe_invoice_id, status, amount_due_cents, amount_paid_cents,
       currency, hosted_invoice_url, invoice_pdf, period_start, period_end)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
       CASE WHEN $9::bigint IS NULL THEN NULL ELSE to_timestamp($9::bigint) END,
       CASE WHEN $10::bigint IS NULL THEN NULL ELSE to_timestamp($10::bigint) END)
     ON CONFLICT (stripe_invoice_id) DO UPDATE SET
       status = EXCLUDED.status,
       amount_due_cents = EXCLUDED.amount_due_cents,
       amount_paid_cents = EXCLUDED.amount_paid_cents,
       hosted_invoice_url = EXCLUDED.hosted_invoice_url,
       invoice_pdf = EXCLUDED.invoice_pdf`,
    [
      accountId, invoice.id, invoice.status || (successful ? "paid" : "payment_failed"),
      Number(invoice.amount_due || 0), Number(invoice.amount_paid || 0),
      invoice.currency || "usd", invoice.hosted_invoice_url || null, invoice.invoice_pdf || null,
      invoice.period_start ?? null, invoice.period_end ?? null,
    ]
  );

  const subscriptionId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription?.id;
  if (subscriptionId) {
    await query(
      `UPDATE account_subscriptions
       SET payment_status = $2,
           status = CASE WHEN $3 THEN 'active' WHEN status = 'active' THEN 'past_due' ELSE status END,
           latest_invoice_id = $4,
           updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [subscriptionId, successful ? "paid" : "failed", successful, invoice.id]
    );
  }
}

async function processEvent(event) {
  const object = event.data?.object || {};
  switch (event.type) {
    case "checkout.session.completed": {
      if (object.subscription) {
        const subscriptionId = typeof object.subscription === "string" ? object.subscription : object.subscription.id;
        const { stripeRequest } = await import("../lib/stripe.js");
        const subscription = await stripeRequest("subscriptions/" + subscriptionId);
        await syncSubscription(subscription, event.livemode);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(object, event.livemode);
      break;
    case "invoice.payment_succeeded":
    case "invoice.paid":
      await syncInvoice(object, true);
      break;
    case "invoice.payment_failed":
      await syncInvoice(object, false);
      break;
    default:
      break;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let eventId = null;
  try {
    getStripeSecret();
    const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
    if (!webhookSecret) return res.status(503).json({ error: "Stripe webhook signing secret is not configured." });

    const rawBody = await readRawBody(req);
    const signature = req.headers?.["stripe-signature"];
    if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
      return res.status(400).json({ error: "Invalid Stripe webhook signature." });
    }

    const event = JSON.parse(rawBody);
    if (!event.id || !event.type || !event.data?.object) {
      return res.status(400).json({ error: "Invalid Stripe event payload." });
    }

    const secretIsLive = String(process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live_");
    if (Boolean(event.livemode) !== secretIsLive) {
      return res.status(400).json({ error: "Stripe event mode does not match the configured secret key." });
    }

    eventId = String(event.id);
    const inserted = await query(
      `INSERT INTO billing_events (stripe_event_id, event_type, livemode, payload)
       VALUES ($1,$2,$3,$4::jsonb)
       ON CONFLICT (stripe_event_id) DO NOTHING
       RETURNING id`,
      [eventId, event.type, Boolean(event.livemode), JSON.stringify(event)]
    );
    if (!inserted.rowCount) {
      const prior = await query(
        "SELECT processed_at FROM billing_events WHERE stripe_event_id = $1",
        [eventId]
      );
      if (prior.rows[0]?.processed_at) return res.status(200).json({ received: true, duplicate: true });
    }

    await processEvent(event);
    await query(
      "UPDATE billing_events SET processed_at = NOW(), processing_error = NULL WHERE stripe_event_id = $1",
      [eventId]
    );
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    if (eventId) {
      try {
        await query(
          "UPDATE billing_events SET processing_error = $2 WHERE stripe_event_id = $1",
          [eventId, String(error.message || error).slice(0, 1000)]
        );
      } catch {}
    }
    return res.status(error.status || 500).json({ error: error.message || "Webhook processing failed." });
  }
}
