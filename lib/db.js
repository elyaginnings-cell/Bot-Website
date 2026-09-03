import pg from "pg";
const { Pool } = pg;
let pool;
let schemaReady = false;
export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
      max: 4,
    });
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
      CREATE TABLE IF NOT EXISTS bot_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    schemaReady = true;
  } finally {
    client.release();
  }
}
