import { query } from "./db.js";

export const DEFAULT_ANNUAL_DISCOUNT_PERCENT = 15;

export function calculateAnnualPriceCents(monthlyPriceCents, discountPercent = DEFAULT_ANNUAL_DISCOUNT_PERCENT) {
  const monthly = Number(monthlyPriceCents);
  const discount = Number(discountPercent);
  if (!Number.isSafeInteger(monthly) || monthly < 0) throw new TypeError("Monthly price must be a non-negative integer number of cents.");
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) throw new TypeError("Annual discount must be between 0 and 100.");
  return Math.round(monthly * 12 * (1 - discount / 100));
}

function paidEntitlementsAllowed(row) {
  if (!row || !["active", "trialing"].includes(row.status)) return false;
  if (!["paid", "no_payment_required"].includes(row.payment_status)) return false;
  if (row.billing_mode === "live") return true;
  return process.env.NODE_ENV !== "production" ||
    (process.env.VERCEL_ENV === "preview" && process.env.BILLING_ALLOW_TEST_ENTITLEMENTS === "true");
}

function shapePlan(row, subscription = null) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    currency: row.currency || "usd",
    monthlyPriceCents: Number(row.monthly_price_cents || 0),
    annualPriceCents: calculateAnnualPriceCents(row.monthly_price_cents || 0, row.annual_discount_percent ?? DEFAULT_ANNUAL_DISCOUNT_PERCENT),
    annualDiscountPercent: Number(row.annual_discount_percent ?? DEFAULT_ANNUAL_DISCOUNT_PERCENT),
    storageLimitBytes: row.storage_limit_bytes == null ? null : Number(row.storage_limit_bytes),
    serverLimit: row.server_limit == null ? null : Number(row.server_limit),
    entitlements: row.entitlements || {},
    subscription: subscription ? {
      status: subscription.status,
      paymentStatus: subscription.payment_status,
      interval: subscription.billing_interval,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      billingMode: subscription.billing_mode,
    } : null,
  };
}

export async function getAccountPlan(accountId) {
  const paid = await query(
    `SELECT p.*, s.status, s.payment_status, s.billing_interval,
            s.current_period_end, s.cancel_at_period_end, s.billing_mode
     FROM account_subscriptions s
     JOIN subscription_plans p ON p.id = s.plan_id
     WHERE s.account_id = $1 AND p.is_active = TRUE
     LIMIT 1`,
    [accountId]
  );
  const active = paid.rows[0];
  if (paidEntitlementsAllowed(active)) {
    const subscription = {
      status: active.status,
      payment_status: active.payment_status,
      billing_interval: active.billing_interval,
      current_period_end: active.current_period_end,
      cancel_at_period_end: active.cancel_at_period_end,
      billing_mode: active.billing_mode,
    };
    return shapePlan(active, subscription);
  }

  const free = await query(
    "SELECT * FROM subscription_plans WHERE id = 'free' AND is_active = TRUE LIMIT 1"
  );
  if (!free.rows[0]) {
    const error = new Error("The Free plan has not been configured by the website owner yet.");
    error.status = 503;
    error.code = "FREE_PLAN_NOT_CONFIGURED";
    throw error;
  }
  return shapePlan(free.rows[0]);
}

export async function requireEntitlement(accountId, feature) {
  const plan = await getAccountPlan(accountId);
  if (plan.entitlements?.[feature] !== true) {
    const error = new Error("This feature is not included in your current subscription.");
    error.status = 402;
    error.code = "SUBSCRIPTION_REQUIRED";
    error.entitlement = feature;
    throw error;
  }
  return plan;
}
