import { query } from "../lib/db.js";
import { requireWebsiteOwner } from "../lib/customerAuth.js";
import { calculateAnnualPriceCents, DEFAULT_ANNUAL_DISCOUNT_PERCENT } from "../lib/subscriptions.js";

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch {}
  }
  return {};
}

function nullableLimit(value, label) {
  if (value === null || value === "" || value === undefined) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    const error = new Error(label + " must be a non-negative integer or blank.");
    error.status = 400;
    throw error;
  }
  return String(number);
}

export default async function handler(req, res) {
  try {
    const owner = await requireWebsiteOwner(req);
    if (req.method === "GET") {
      const result = await query(
        "SELECT * FROM subscription_plans ORDER BY sort_order ASC, monthly_price_cents ASC, id ASC"
      );
      return res.status(200).json({
        plans: result.rows.map((plan) => ({
          ...plan,
          annual_price_cents: calculateAnnualPriceCents(
            plan.monthly_price_cents,
            plan.annual_discount_percent ?? DEFAULT_ANNUAL_DISCOUNT_PERCENT
          ),
        })),
      });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = readBody(req);
    const id = String(body.id || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const monthly = Number(body.monthlyPriceCents);
    const discount = body.annualDiscountPercent === undefined
      ? DEFAULT_ANNUAL_DISCOUNT_PERCENT
      : Number(body.annualDiscountPercent);
    const currency = String(body.currency || "usd").trim().toLowerCase();
    const entitlements = body.entitlements && typeof body.entitlements === "object" && !Array.isArray(body.entitlements)
      ? body.entitlements
      : null;
    const storageLimit = nullableLimit(body.storageLimitBytes, "Storage limit");
    const serverLimit = nullableLimit(body.serverLimit, "Server limit");

    if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(id)) return res.status(400).json({ error: "Plan ID must be 2–40 lowercase letters, numbers, dashes, or underscores." });
    if (!name || name.length > 80) return res.status(400).json({ error: "Plan name is required and must be 80 characters or fewer." });
    if (!Number.isSafeInteger(monthly) || monthly < 0) return res.status(400).json({ error: "Monthly price must be a non-negative integer number of cents." });
    if (!/^[a-z]{3}$/.test(currency)) return res.status(400).json({ error: "Currency must be a three-letter lowercase code." });
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) return res.status(400).json({ error: "Annual discount must be between 0 and 100." });
    if (!entitlements) return res.status(400).json({ error: "Entitlements must be an object." });
    if (id === "free" && monthly !== 0) return res.status(400).json({ error: "The Free plan must have a monthly price of zero." });
    if (id === "free" && (storageLimit === null || serverLimit === null)) return res.status(400).json({ error: "The Free plan requires explicit storage and connected-server limits." });

    const annualPriceCents = calculateAnnualPriceCents(monthly, discount);
    const result = await query(
      `INSERT INTO subscription_plans
        (id, name, description, monthly_price_cents, currency, annual_discount_percent,
         annual_enabled, entitlements, storage_limit_bytes, server_limit,
         is_active, is_public, sort_order, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         monthly_price_cents = EXCLUDED.monthly_price_cents,
         currency = EXCLUDED.currency,
         annual_discount_percent = EXCLUDED.annual_discount_percent,
         annual_enabled = EXCLUDED.annual_enabled,
         entitlements = EXCLUDED.entitlements,
         storage_limit_bytes = EXCLUDED.storage_limit_bytes,
         server_limit = EXCLUDED.server_limit,
         is_active = EXCLUDED.is_active,
         is_public = EXCLUDED.is_public,
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()
       RETURNING *`,
      [
        id, name, String(body.description || "").slice(0, 500), monthly, currency, discount,
        id !== "free" && body.annualEnabled !== false, JSON.stringify(entitlements), storageLimit, serverLimit,
        id === "free" ? true : body.active !== false, id === "free" ? true : body.public !== false, Number.isSafeInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      ]
    );

    await query(
      `INSERT INTO owner_audit_log (actor_account_id, action, details)
       VALUES ($1, 'subscription_plan_upsert', $2::jsonb)`,
      [owner.account.id, JSON.stringify({ planId: id, annualPriceCents })]
    );

    return res.status(200).json({ plan: result.rows[0], annualPriceCents });
  } catch (error) {
    console.error("Owner plans API error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Could not manage subscription plans.",
      code: error.code || undefined,
    });
  }
}
