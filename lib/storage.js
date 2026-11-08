import { getPool, ensureSchema, query } from "./db.js";
import { getAccountPlan } from "./subscriptions.js";

function storageError(message, status, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizeObject(input) {
  const accountId = String(input.accountId || "").trim();
  const objectKey = String(input.objectKey || "").trim();
  const guildId = input.guildId ? String(input.guildId).trim() : null;
  const byteSize = Number(input.byteSize);
  if (!accountId || !objectKey || objectKey.length > 500) {
    throw storageError("Account ID and a valid storage object key are required.", 400, "INVALID_STORAGE_OBJECT");
  }
  if (!Number.isSafeInteger(byteSize) || byteSize < 0) {
    throw storageError("Storage size must be a non-negative safe integer.", 400, "INVALID_STORAGE_SIZE");
  }
  return { accountId, objectKey, guildId, byteSize, contentHash: input.contentHash ? String(input.contentHash).slice(0, 128) : null };
}

export async function recordStorageObject(input) {
  const object = normalizeObject(input);
  const plan = await getAccountPlan(object.accountId);
  if (object.guildId) {
    const linked = await query(
      "SELECT 1 FROM customer_servers WHERE account_id = $1 AND guild_id = $2",
      [object.accountId, object.guildId]
    );
    if (!linked.rowCount) throw storageError("The server is not connected to this customer account.", 403, "STORAGE_SERVER_NOT_LINKED");
  }

  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO account_storage_usage (account_id, used_bytes) VALUES ($1, 0) ON CONFLICT (account_id) DO NOTHING",
      [object.accountId]
    );
    const usage = await client.query(
      "SELECT used_bytes FROM account_storage_usage WHERE account_id = $1 FOR UPDATE",
      [object.accountId]
    );
    const existing = await client.query(
      "SELECT byte_size FROM storage_objects WHERE account_id = $1 AND object_key = $2 FOR UPDATE",
      [object.accountId, object.objectKey]
    );
    const previousBytes = Number(existing.rows[0]?.byte_size || 0);
    const currentBytes = Number(usage.rows[0]?.used_bytes || 0);
    const nextBytes = currentBytes - previousBytes + object.byteSize;
    if (plan.storageLimitBytes !== null && nextBytes > plan.storageLimitBytes) {
      throw storageError(
        "This upload would exceed the storage allowance for your " + plan.name + " plan.",
        413,
        "STORAGE_LIMIT_EXCEEDED"
      );
    }

    await client.query(
      `INSERT INTO storage_objects
        (account_id, guild_id, object_key, byte_size, content_hash, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (account_id, object_key) DO UPDATE SET
         guild_id = EXCLUDED.guild_id,
         byte_size = EXCLUDED.byte_size,
         content_hash = EXCLUDED.content_hash,
         updated_at = NOW()`,
      [object.accountId, object.guildId, object.objectKey, object.byteSize, object.contentHash]
    );
    await client.query(
      "UPDATE account_storage_usage SET used_bytes = $2, updated_at = NOW() WHERE account_id = $1",
      [object.accountId, nextBytes]
    );
    await client.query("COMMIT");
    return { usedBytes: nextBytes, limitBytes: plan.storageLimitBytes, remainingBytes: plan.storageLimitBytes === null ? null : Math.max(0, plan.storageLimitBytes - nextBytes) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function removeStorageObject(accountId, objectKey) {
  const account = String(accountId || "").trim();
  const key = String(objectKey || "").trim();
  if (!account || !key) throw storageError("Account ID and object key are required.", 400, "INVALID_STORAGE_OBJECT");
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO account_storage_usage (account_id, used_bytes) VALUES ($1, 0) ON CONFLICT (account_id) DO NOTHING",
      [account]
    );
    const usage = await client.query(
      "SELECT used_bytes FROM account_storage_usage WHERE account_id = $1 FOR UPDATE",
      [account]
    );
    const removed = await client.query(
      "DELETE FROM storage_objects WHERE account_id = $1 AND object_key = $2 RETURNING byte_size",
      [account, key]
    );
    const current = Number(usage.rows[0]?.used_bytes || 0);
    const next = Math.max(0, current - Number(removed.rows[0]?.byte_size || 0));
    await client.query(
      "UPDATE account_storage_usage SET used_bytes = $2, updated_at = NOW() WHERE account_id = $1",
      [account, next]
    );
    await client.query("COMMIT");
    return { removed: Boolean(removed.rowCount), usedBytes: next };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function getStorageSummary(accountId) {
  const result = await query(
    "SELECT used_bytes, updated_at FROM account_storage_usage WHERE account_id = $1",
    [accountId]
  );
  return { usedBytes: Number(result.rows[0]?.used_bytes || 0), updatedAt: result.rows[0]?.updated_at || null };
}

export async function reconcileStorageUsage(accountId) {
  const result = await query(
    `INSERT INTO account_storage_usage (account_id, used_bytes, updated_at)
     SELECT $1, COALESCE(SUM(byte_size), 0), NOW()
     FROM storage_objects WHERE account_id = $1
     ON CONFLICT (account_id) DO UPDATE SET
       used_bytes = EXCLUDED.used_bytes,
       updated_at = NOW()
     RETURNING used_bytes, updated_at`,
    [accountId]
  );
  return { usedBytes: Number(result.rows[0]?.used_bytes || 0), updatedAt: result.rows[0]?.updated_at || null };
}
