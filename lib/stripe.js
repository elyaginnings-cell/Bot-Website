import crypto from "crypto";
import { query } from "./db.js";
import { calculateAnnualPriceCents, DEFAULT_ANNUAL_DISCOUNT_PERCENT } from "./subscriptions.js";

export function getStripeSecret() {
  const secret = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!secret) {
    const error = new Error("Stripe is not configured. Add a Stripe test-mode secret key to the preview environment.");
    error.status = 503;
    error.code = "STRIPE_NOT_CONFIGURED";
    throw error;
  }
  if (secret.startsWith("sk_live_") && process.env.BILLING_LIVE_ENABLED !== "true") {
    const error = new Error("Live billing is disabled until the website owner completes the adult-assisted activation process.");
    error.status = 503;
    error.code = "LIVE_BILLING_DISABLED";
    throw error;
  }
  if (!secret.startsWith("sk_test_") && !secret.startsWith("sk_live_")) {
    const error = new Error("The Stripe secret key format is invalid.");
    error.status = 503;
    error.code = "INVALID_STRIPE_KEY";
    throw error;
  }
  return secret;
}

export async function stripeRequest(path, { method = "GET", params = {}, idempotencyKey } = {}) {
  const secret = getStripeSecret();
  const url = new URL("https://api.stripe.com/v1/" + path.replace(/^\//, ""));
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) body.set(key, String(value));
  }
  const headers = { Authorization: "Bearer " + secret };
  if (method !== "GET") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  if (method === "GET" && body.size) url.search = body.toString();

  const response = await fetch(url, {
    method,
    headers,
    body: method === "GET" ? undefined : body.toString(),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || "Stripe request failed.");
    error.status = response.status >= 500 ? 502 : 400;
    error.code = data?.error?.code || "STRIPE_REQUEST_FAILED";
    throw error;
  }
  return data;
}

export async function ensureStripeCustomer(account) {
  const existing = await query(
    "SELECT stripe_customer_id FROM billing_customers WHERE account_id = $1",
    [account.id]
  );
  if (existing.rows[0]) return existing.rows[0].stripe_customer_id;

  const customer = await stripeRequest("customers", {
    method: "POST",
    idempotencyKey: "customer-" + account.id,
    params: {
      email: account.email || undefined,
      name: account.global_name || account.username || undefined,
      "metadata[account_id]": account.id,
    },
  });
  await query(
    `INSERT INTO billing_customers (account_id, stripe_customer_id)
     VALUES ($1, $2)
     ON CONFLICT (account_id) DO NOTHING`,
    [account.id, customer.id]
  );
  const saved = await query(
    "SELECT stripe_customer_id FROM billing_customers WHERE account_id = $1",
    [account.id]
  );
  return saved.rows[0]?.stripe_customer_id || customer.id;
}

export async function ensureStripePrice(plan, interval) {
  const annual = interval === "year";
  if (annual && !plan.annual_enabled) {
    const error = new Error("Annual billing is not enabled for this plan.");
    error.status = 400;
    error.code = "ANNUAL_BILLING_DISABLED";
    throw error;
  }

  const priceColumn = annual ? "stripe_annual_price_id" : "stripe_monthly_price_id";
  const expectedAmount = annual
    ? calculateAnnualPriceCents(plan.monthly_price_cents, plan.annual_discount_percent ?? DEFAULT_ANNUAL_DISCOUNT_PERCENT)
    : Number(plan.monthly_price_cents);
  if (plan[priceColumn]) {
    const savedPrice = await stripeRequest("prices/" + plan[priceColumn]).catch(() => null);
    if (savedPrice && Number(savedPrice.unit_amount) === expectedAmount &&
        String(savedPrice.currency || "").toLowerCase() === String(plan.currency || "usd").toLowerCase() &&
        savedPrice.recurring?.interval === (annual ? "year" : "month")) {
      return plan[priceColumn];
    }
  }

  let productId = plan.stripe_product_id;
  if (!productId) {
    const product = await stripeRequest("products", {
      method: "POST",
      idempotencyKey: "product-" + plan.id,
      params: {
        name: plan.name,
        description: plan.description || undefined,
        "metadata[plan_id]": plan.id,
      },
    });
    productId = product.id;
    await query("UPDATE subscription_plans SET stripe_product_id = $2, updated_at = NOW() WHERE id = $1", [plan.id, productId]);
  }

  const unitAmount = expectedAmount;
  const price = await stripeRequest("prices", {
    method: "POST",
    idempotencyKey: "price-" + plan.id + "-" + interval + "-" + String(plan.currency || "usd").toLowerCase() + "-" + unitAmount,
    params: {
      product: productId,
      currency: plan.currency || "usd",
      unit_amount: unitAmount,
      "recurring[interval]": annual ? "year" : "month",
      "metadata[plan_id]": plan.id,
      "metadata[billing_interval]": interval,
    },
  });
  await query(
    `UPDATE subscription_plans SET ${priceColumn} = $2, updated_at = NOW() WHERE id = $1`,
    [plan.id, price.id]
  );
  return price.id;
}

export function verifyStripeSignature(rawBody, signatureHeader, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!rawBody || !signatureHeader || !secret) return false;
  const parts = String(signatureHeader).split(",").map((part) => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || !signatures.length) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(String(timestamp) + "." + rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const candidate = Buffer.from(signature, "hex");
    return candidate.length === expectedBuffer.length && crypto.timingSafeEqual(candidate, expectedBuffer);
  });
}

export async function loadPlan(planId) {
  const result = await query(
    "SELECT * FROM subscription_plans WHERE id = $1 AND is_active = TRUE AND is_public = TRUE LIMIT 1",
    [planId]
  );
  return result.rows[0] || null;
}
