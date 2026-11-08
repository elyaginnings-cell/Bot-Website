import crypto from "crypto";
import { requireCustomerAccount } from "../customerAuth.js";
import { getAccountPlan } from "../subscriptions.js";
import { getStorageSummary, recordStorageObject, removeStorageObject } from "../storage.js";

function authorizedService(req) {
  const expected = String(process.env.STORAGE_API_SECRET || "");
  const supplied = String(req.headers?.["x-storage-secret"] || "");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch {}
  }
  return {};
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const customer = await requireCustomerAccount(req);
      const [plan, usage] = await Promise.all([
        getAccountPlan(customer.account.id),
        getStorageSummary(customer.account.id),
      ]);
      return res.status(200).json({
        usedBytes: usage.usedBytes,
        limitBytes: plan.storageLimitBytes,
        remainingBytes: plan.storageLimitBytes === null ? null : Math.max(0, plan.storageLimitBytes - usage.usedBytes),
        updatedAt: usage.updatedAt,
      });
    }

    if (!["POST", "DELETE"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
    if (!authorizedService(req)) return res.status(401).json({ error: "Storage service authentication failed." });

    const body = readBody(req);
    if (req.method === "POST") {
      const result = await recordStorageObject({
        accountId: body.accountId,
        guildId: body.guildId,
        objectKey: body.objectKey,
        byteSize: body.byteSize,
        contentHash: body.contentHash,
      });
      return res.status(200).json({ ok: true, ...result });
    }

    const result = await removeStorageObject(body.accountId, body.objectKey);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error("Storage API error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Storage operation failed.",
      code: error.code || undefined,
    });
  }
}
