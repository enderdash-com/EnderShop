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
    minecraft_uuid TEXT,
    stripe_customer_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS customer_profile_stripe_customer_idx
    ON customer_profile (stripe_customer_id);
  CREATE INDEX IF NOT EXISTS customer_profile_minecraft_uuid_idx
    ON customer_profile (minecraft_uuid);

  CREATE TABLE IF NOT EXISTS stripe_event (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    processed_at TEXT NOT NULL
  );
`

let bootstrapPromise: Promise<void> | null = null

export async function ensureAppDatabase() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const db = getD1Database()
      await db.exec(bootstrapSql)
      await runMigrations(db)
    })()
  }

  await bootstrapPromise
}

async function runMigrations(db: D1Database) {
  const existing = await db
    .prepare("PRAGMA table_info('customer_profile')")
    .all<{ name: string }>()
  const columns = new Set(existing.results.map((row) => row.name))

  if (!columns.has("minecraft_uuid")) {
    await db
      .prepare("ALTER TABLE customer_profile ADD COLUMN minecraft_uuid TEXT")
      .run()
  }
}
