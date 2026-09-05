import pg from "pg";

const { Pool } = pg;

let pool;
let schemaReady = false;

function getConnectionString() {
  return (
    process.env.DATABASE_PUBLIC_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ""
  ).trim();
}

function parseDatabaseUrl(raw) {
  if (!raw) {
    throw new Error("Missing DATABASE_URL. In Vercel add the Railway PUBLIC Postgres URL.");
  }
  if (!raw.includes("://")) {
    throw new Error("DATABASE_URL must look like postgresql://user:pass@host:port/dbname");
  }

  let parsed;
  try {
    parsed = new URL(raw.replace(/^postgres:\/\//, "postgresql://"));
  } catch {
    throw new Error("DATABASE_URL is not a valid URL. Copy the full public URL from Railway.");
  }

  const host = parsed.hostname || "";
  if (!host || host === "base" || host === "localhost" || host.endsWith(".railway.internal")) {
    throw new Error(
      `Database host "${host || "(empty)"}" is not reachable from Vercel. In Railway open Postgres → Variables → copy the PUBLIC URL (host should look like xxx.proxy.rlwy.net), then paste that as DATABASE_URL on Vercel.`
    );
  }

  return {
    host,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username || "postgres"),
    password: decodeURIComponent(parsed.password || ""),
    database: decodeURIComponent((parsed.pathname || "/railway").replace(/^\//, "") || "railway"),
    ssl: { rejectUnauthorized: false },
    max: 4,
  };
}

export function getPool() {
  if (!pool) {
    pool = new Pool(parseDatabaseUrl(getConnectionString()));
  }
  return pool;
}

export async function query(text, params = []) {
  await ensureSchema();
  return getPool().query(text, params);
}

export async function ensureSchema() {
  if (schemaReady) return;
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE,
        password_hash TEXT,
        discord_id TEXT UNIQUE,
        username TEXT,
        global_name TEXT,
        avatar TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Shared with the Discord bot: key/value rows
    // Website: guild_config:<guildId>
    // Bot runtime: bot_runtime
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // If an old bot created bot_state(id, data), migrate into key/value then drop legacy cols if needed
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bot_state'
    `);
    const names = new Set(cols.rows.map((r) => r.column_name));

    if (names.has("data") && names.has("id") && !names.has("key")) {
      // Fully legacy table — rename and rebuild
      await client.query(`ALTER TABLE bot_state RENAME TO bot_state_legacy`);
      await client.query(`
        CREATE TABLE bot_state (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      try {
        await client.query(`
          INSERT INTO bot_state (key, value, updated_at)
          SELECT 'bot_runtime', data, COALESCE(updated_at, NOW())
          FROM bot_state_legacy WHERE id = 1
          ON CONFLICT (key) DO NOTHING
        `);
      } catch (_) {}
      console.log("Migrated legacy bot_state(id/data) to key/value");
    } else if (names.has("data") && names.has("id") && names.has("key")) {
      // Mixed — copy runtime if missing
      try {
        await client.query(`
          INSERT INTO bot_state (key, value, updated_at)
          SELECT 'bot_runtime', data, COALESCE(updated_at, NOW())
          FROM bot_state WHERE id = 1 AND data IS NOT NULL
          ON CONFLICT (key) DO NOTHING
        `);
      } catch (_) {}
    }

    schemaReady = true;
  } finally {
    client.release();
  }
}
