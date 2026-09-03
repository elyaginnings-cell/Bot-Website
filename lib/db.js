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
