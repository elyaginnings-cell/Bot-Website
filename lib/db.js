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


    // Customer platform: additive tables only. Existing bot/account data is preserved.
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        monthly_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (monthly_price_cents >= 0),
        currency TEXT NOT NULL DEFAULT 'usd',
        annual_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 15 CHECK (annual_discount_percent >= 0 AND annual_discount_percent <= 100),
        annual_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        stripe_product_id TEXT,
        stripe_monthly_price_id TEXT,
        stripe_annual_price_id TEXT,
        entitlements JSONB NOT NULL DEFAULT '{}'::jsonb,
        storage_limit_bytes BIGINT,
        server_limit INTEGER,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS billing_customers (
        account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        stripe_customer_id TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS account_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
        plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
        stripe_subscription_id TEXT UNIQUE,
        stripe_customer_id TEXT,
        billing_interval TEXT NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
        status TEXT NOT NULL DEFAULT 'inactive',
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        billing_mode TEXT NOT NULL DEFAULT 'test' CHECK (billing_mode IN ('test', 'live')),
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
        canceled_at TIMESTAMPTZ,
        trial_end TIMESTAMPTZ,
        latest_invoice_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS account_subscriptions_status_idx
        ON account_subscriptions(status, current_period_end);
      CREATE TABLE IF NOT EXISTS billing_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        stripe_invoice_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        amount_due_cents INTEGER NOT NULL DEFAULT 0,
        amount_paid_cents INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'usd',
        hosted_invoice_url TEXT,
        invoice_pdf TEXT,
        period_start TIMESTAMPTZ,
        period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS billing_invoices_account_idx
        ON billing_invoices(account_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS billing_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stripe_event_id TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        livemode BOOLEAN NOT NULL DEFAULT FALSE,
        payload JSONB NOT NULL,
        processed_at TIMESTAMPTZ,
        processing_error TEXT,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS customer_servers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        guild_id TEXT NOT NULL UNIQUE,
        guild_name TEXT NOT NULL,
        discord_user_id TEXT NOT NULL,
        access_level TEXT NOT NULL CHECK (access_level IN ('owner', 'administrator', 'manager')),
        verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        transferred_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS customer_servers_account_idx
        ON customer_servers(account_id, connected_at);
      CREATE TABLE IF NOT EXISTS storage_objects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        guild_id TEXT,
        object_key TEXT NOT NULL,
        byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
        content_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(account_id, object_key)
      );
      CREATE INDEX IF NOT EXISTS storage_objects_account_idx
        ON storage_objects(account_id);
      CREATE TABLE IF NOT EXISTS account_storage_usage (
        account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        used_bytes BIGINT NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS owner_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        target_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
        target_guild_id TEXT,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS owner_audit_log_created_idx
        ON owner_audit_log(created_at DESC);
    `);

    schemaReady = true;
  } finally {
    client.release();
  }
}
