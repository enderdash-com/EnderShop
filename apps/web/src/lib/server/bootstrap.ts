import { getD1Database } from "@/lib/server/worker-env"

const bootstrapSql = `
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    email_verified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_anonymous INTEGER DEFAULT 0
  );
  CREATE UNIQUE INDEX IF NOT EXISTS user_email_uidx ON user (email);

  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY NOT NULL,
    expires_at INTEGER NOT NULL,
    token TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
  );
  CREATE UNIQUE INDEX IF NOT EXISTS session_token_uidx ON session (token);
  CREATE INDEX IF NOT EXISTS session_user_id_idx ON session (user_id);

  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at INTEGER,
    refresh_token_expires_at INTEGER,
    scope TEXT,
    password TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS account_provider_account_uidx
    ON account (provider_id, account_id);
  CREATE INDEX IF NOT EXISTS account_user_id_idx ON account (user_id);

  CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY NOT NULL,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS verification_identifier_idx
    ON verification (identifier);

  CREATE TABLE IF NOT EXISTS customer_profile (
    user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    minecraft_username TEXT,
    stripe_customer_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS customer_profile_stripe_customer_idx
    ON customer_profile (stripe_customer_id);

  CREATE TABLE IF NOT EXISTS rank_entitlement (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_kind TEXT NOT NULL,
    minecraft_username TEXT NOT NULL,
    stripe_checkout_session_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    stripe_invoice_id TEXT,
    status TEXT NOT NULL,
    fulfillment_status TEXT NOT NULL,
    command_result TEXT,
    command_error TEXT,
    last_fulfilled_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    canceled_at TEXT
  );
  CREATE INDEX IF NOT EXISTS rank_entitlement_user_id_idx
    ON rank_entitlement (user_id);
  CREATE INDEX IF NOT EXISTS rank_entitlement_product_id_idx
    ON rank_entitlement (product_id);
  CREATE INDEX IF NOT EXISTS rank_entitlement_status_idx
    ON rank_entitlement (status);

  CREATE TABLE IF NOT EXISTS stripe_event (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    processed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fulfillment_log (
    id TEXT PRIMARY KEY NOT NULL,
    entitlement_id TEXT NOT NULL REFERENCES rank_entitlement(id) ON DELETE CASCADE,
    phase TEXT NOT NULL,
    command TEXT NOT NULL,
    outcome TEXT NOT NULL,
    response_json TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS fulfillment_log_entitlement_id_idx
    ON fulfillment_log (entitlement_id);
`

let bootstrapPromise: Promise<void> | null = null

export async function ensureAppDatabase() {
  if (!bootstrapPromise) {
    bootstrapPromise = getD1Database()
      .exec(bootstrapSql)
      .then(() => undefined)
  }

  await bootstrapPromise
}
