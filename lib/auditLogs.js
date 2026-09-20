/**
 * Website-side access to central audit_logs tables (shared Postgres).
 */
import { query, getPool } from "./db.js";

let schemaReady = false;

export async function ensureAuditSchema() {
  if (schemaReady) return;
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        category TEXT NOT NULL,
        action TEXT,
        actor_id TEXT,
        actor_name TEXT,
        target_id TEXT,
        target_name TEXT,
        channel_id TEXT,
        channel_name TEXT,
        reason TEXT,
        message_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log_message_content (
        log_id UUID PRIMARY KEY REFERENCES audit_logs(id) ON DELETE CASCADE,
        guild_id TEXT NOT NULL,
        content TEXT,
        before_content TEXT,
        after_content TEXT,
        attachments JSONB,
        embeds_snapshot JSONB,
        original_created_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS audit_logs_guild_created_idx
        ON audit_logs (guild_id, created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS audit_logs_guild_type_idx
        ON audit_logs (guild_id, event_type, created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS audit_logs_guild_category_idx
        ON audit_logs (guild_id, category, created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS audit_logs_guild_actor_idx
        ON audit_logs (guild_id, actor_id, created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS audit_logs_guild_target_idx
        ON audit_logs (guild_id, target_id, created_at DESC);
    `);
    schemaReady = true;
  } finally {
    client.release();
  }
}

export async function listAuditLogs(guildId, opts = {}) {
  await ensureAuditSchema();
  const limit = Math.min(100, Math.max(1, Number(opts.limit) || 25));
  const offset = Math.max(0, Number(opts.offset) || 0);
  const params = [String(guildId)];
  const where = ["guild_id = $1"];
  let i = 2;

  if (opts.category) {
    where.push(`category = $${i++}`);
    params.push(String(opts.category));
  }
  if (opts.eventType) {
    where.push(`event_type = $${i++}`);
    params.push(String(opts.eventType));
  }
  if (opts.actorId) {
    where.push(`(actor_id = $${i} OR target_id = $${i})`);
    params.push(String(opts.actorId));
    i++;
  }
  if (opts.q) {
    where.push(
      `(reason ILIKE $${i} OR actor_name ILIKE $${i} OR target_name ILIKE $${i} OR event_type ILIKE $${i})`
    );
    params.push(`%${String(opts.q).slice(0, 100)}%`);
    i++;
  }

  const whereSql = where.join(" AND ");
  const countR = await query(
    `SELECT COUNT(*)::int AS n FROM audit_logs WHERE ${whereSql}`,
    params
  );
  const total = countR.rows[0]?.n || 0;
  params.push(limit, offset);
  const rows = await query(
    `SELECT id, guild_id, event_type, category, action,
            actor_id, actor_name, target_id, target_name,
            channel_id, channel_name, reason, message_id,
            metadata, created_at
     FROM audit_logs
     WHERE ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${i++} OFFSET $${i}`,
    params
  );
  return { rows: rows.rows, total, limit, offset };
}

export async function getAuditLog(guildId, logId) {
  await ensureAuditSchema();
  const r = await query(
    `SELECT l.*,
            c.content, c.before_content, c.after_content,
            c.attachments, c.embeds_snapshot, c.original_created_at,
            c.expires_at AS content_expires_at
     FROM audit_logs l
     LEFT JOIN audit_log_message_content c ON c.log_id = l.id
     WHERE l.guild_id = $1 AND l.id = $2`,
    [String(guildId), String(logId)]
  );
  return r.rows[0] || null;
}
