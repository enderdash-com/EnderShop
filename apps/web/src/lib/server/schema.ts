import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .default(false)
      .notNull(),
    image: text("image"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
    isAnonymous: integer("is_anonymous", { mode: "boolean" }).default(false),
  },
  (table) => [uniqueIndex("user_email_uidx").on(table.email)]
)

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_uidx").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ]
)

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("account_provider_account_uidx").on(
      table.providerId,
      table.accountId
    ),
    index("account_user_id_idx").on(table.userId),
  ]
)

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
)

export const customerProfile = sqliteTable(
  "customer_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    minecraftUsername: text("minecraft_username"),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [index("customer_profile_stripe_customer_idx").on(table.stripeCustomerId)]
)

export const rankEntitlement = sqliteTable(
  "rank_entitlement",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    productKind: text("product_kind").notNull(),
    minecraftUsername: text("minecraft_username").notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeInvoiceId: text("stripe_invoice_id"),
    status: text("status").notNull(),
    fulfillmentStatus: text("fulfillment_status").notNull(),
    commandResult: text("command_result"),
    commandError: text("command_error"),
    lastFulfilledAt: text("last_fulfilled_at"),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    canceledAt: text("canceled_at"),
  },
  (table) => [
    uniqueIndex("rank_entitlement_checkout_uidx").on(
      table.stripeCheckoutSessionId
    ),
    uniqueIndex("rank_entitlement_payment_intent_uidx").on(
      table.stripePaymentIntentId
    ),
    uniqueIndex("rank_entitlement_subscription_uidx").on(
      table.stripeSubscriptionId
    ),
    index("rank_entitlement_user_id_idx").on(table.userId),
    index("rank_entitlement_product_id_idx").on(table.productId),
    index("rank_entitlement_status_idx").on(table.status),
  ]
)

export const stripeEvent = sqliteTable("stripe_event", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: text("processed_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export const fulfillmentLog = sqliteTable(
  "fulfillment_log",
  {
    id: text("id").primaryKey(),
    entitlementId: text("entitlement_id")
      .notNull()
      .references(() => rankEntitlement.id, { onDelete: "cascade" }),
    phase: text("phase").notNull(),
    command: text("command").notNull(),
    outcome: text("outcome").notNull(),
    responseJson: text("response_json"),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [index("fulfillment_log_entitlement_id_idx").on(table.entitlementId)]
)

export const userRelations = relations(user, ({ many, one }) => ({
  accounts: many(account),
  customerProfile: one(customerProfile, {
    fields: [user.id],
    references: [customerProfile.userId],
  }),
  entitlements: many(rankEntitlement),
  sessions: many(session),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const customerProfileRelations = relations(customerProfile, ({ one }) => ({
  user: one(user, {
    fields: [customerProfile.userId],
    references: [user.id],
  }),
}))

export const rankEntitlementRelations = relations(rankEntitlement, ({ many, one }) => ({
  fulfillmentLogs: many(fulfillmentLog),
  user: one(user, {
    fields: [rankEntitlement.userId],
    references: [user.id],
  }),
}))

export const fulfillmentLogRelations = relations(fulfillmentLog, ({ one }) => ({
  entitlement: one(rankEntitlement, {
    fields: [fulfillmentLog.entitlementId],
    references: [rankEntitlement.id],
  }),
}))

export const schema = {
  account,
  customerProfile,
  fulfillmentLog,
  rankEntitlement,
  session,
  stripeEvent,
  user,
  verification,
}
