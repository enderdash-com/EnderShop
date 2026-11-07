import { and, eq, ne, sql } from "drizzle-orm"
import type { CustomerProfile } from "@/lib/shop/types"
import { Effect } from "effect"
import { databaseOperation, ShopInputError } from "./shop-services"
import { customerProfile, stripeEvent } from "@/lib/server/schema"

function nowIso() {
  return new Date().toISOString()
}

function mapProfileRow(
  row:
    | {
        minecraftUsername: string | null
        minecraftUuid: string | null
        stripeCustomerId: string | null
        updatedAt: string
      }
    | undefined
): CustomerProfile {
  return {
    minecraftUsername: row?.minecraftUsername ?? null,
    minecraftUuid: row?.minecraftUuid ?? null,
    stripeCustomerId: row?.stripeCustomerId ?? null,
    updatedAt: row?.updatedAt ?? null,
  }
}

export const getCustomerProfile = Effect.fn("ShopStore.getCustomerProfile")(
  function* (userId: string) {
    const [row] = yield* databaseOperation("get-profile", (db) =>
      db
        .select({
          minecraftUsername: customerProfile.minecraftUsername,
          minecraftUuid: customerProfile.minecraftUuid,
          stripeCustomerId: customerProfile.stripeCustomerId,
          updatedAt: customerProfile.updatedAt,
        })
        .from(customerProfile)
        .where(eq(customerProfile.userId, userId))
        .limit(1)
    )

    return mapProfileRow(row)
  }
)

export const ensureCustomerProfile = Effect.fn(
  "ShopStore.ensureCustomerProfile"
)(function* (userId: string) {
  const existing = yield* getCustomerProfile(userId)
  if (existing.updatedAt) {
    return existing
  }

  const timestamp = nowIso()

  yield* databaseOperation("create-profile", (db) =>
    db
      .insert(customerProfile)
      .values({
        createdAt: timestamp,
        minecraftUsername: null,
        minecraftUuid: null,
        stripeCustomerId: null,
        updatedAt: timestamp,
        userId,
      })
      .onConflictDoNothing({ target: customerProfile.userId })
  )

  return yield* getCustomerProfile(userId)
}, Effect.uninterruptible)

export const updateCustomerProfile = Effect.fn(
  "ShopStore.updateCustomerProfile"
)(function* (input: {
  minecraftUsername: string
  minecraftUuid: string
  userId: string
}) {
  yield* ensureCustomerProfile(input.userId)

  const conflicts = yield* databaseOperation("find-profile-conflict", (db) =>
    db
      .select({ userId: customerProfile.userId })
      .from(customerProfile)
      .where(
        and(
          eq(customerProfile.minecraftUuid, input.minecraftUuid),
          ne(customerProfile.userId, input.userId)
        )
      )
      .limit(1)
  )

  if (conflicts.length > 0) {
    return yield* new ShopInputError({
      message:
        "That Minecraft account is already linked to another shop account.",
    })
  }

  const timestamp = nowIso()

  yield* databaseOperation("update-profile", (db) =>
    db
      .update(customerProfile)
      .set({
        minecraftUsername: input.minecraftUsername,
        minecraftUuid: input.minecraftUuid,
        updatedAt: timestamp,
      })
      .where(eq(customerProfile.userId, input.userId))
  )

  return yield* getCustomerProfile(input.userId)
}, Effect.uninterruptible)

export const setStripeCustomerId = Effect.fn("ShopStore.setStripeCustomerId")(
  function* (input: { stripeCustomerId: string; userId: string }) {
    yield* ensureCustomerProfile(input.userId)

    yield* databaseOperation("set-stripe-customer", (db) =>
      db
        .update(customerProfile)
        .set({
          stripeCustomerId: input.stripeCustomerId,
          updatedAt: nowIso(),
        })
        .where(eq(customerProfile.userId, input.userId))
    )

    return yield* getCustomerProfile(input.userId)
  },
  Effect.uninterruptible
)

export const reassignAnonymousUserData = Effect.fn(
  "ShopStore.reassignAnonymousUserData"
)(function* (input: { newUserId: string; previousUserId: string }) {
  if (input.previousUserId === input.newUserId) return
  const previous = yield* getCustomerProfile(input.previousUserId)

  if (!previous.updatedAt) {
    return
  }

  // D1 batches are atomic. Release the previous UUID and publish the merged
  // profile in the same batch, so the unique UUID index never blocks transfer
  // and a failed publication restores the previous profile.
  const createdAt = previous.updatedAt
  yield* databaseOperation("transfer-profile", (db) =>
    db.batch([
      db
        .delete(customerProfile)
        .where(eq(customerProfile.userId, input.previousUserId)),
      db
        .insert(customerProfile)
        .values({
          userId: input.newUserId,
          createdAt,
          updatedAt: nowIso(),
          minecraftUsername: previous.minecraftUsername,
          minecraftUuid: previous.minecraftUuid,
          stripeCustomerId: previous.stripeCustomerId,
        })
        .onConflictDoUpdate({
          target: customerProfile.userId,
          set: {
            minecraftUsername: sql`coalesce(${customerProfile.minecraftUsername}, excluded.minecraft_username)`,
            minecraftUuid: sql`coalesce(${customerProfile.minecraftUuid}, excluded.minecraft_uuid)`,
            stripeCustomerId: sql`coalesce(${customerProfile.stripeCustomerId}, excluded.stripe_customer_id)`,
            updatedAt: nowIso(),
          },
        }),
    ])
  )
}, Effect.uninterruptible)

export const recordStripeEvent = Effect.fn("ShopStore.recordStripeEvent")(
  function* (input: { id: string; type: string }) {
    const inserted = yield* databaseOperation("claim-stripe-event", (db) =>
      db
        .insert(stripeEvent)
        .values({
          id: input.id,
          processedAt: nowIso(),
          type: input.type,
        })
        .onConflictDoNothing({ target: stripeEvent.id })
        .returning({ id: stripeEvent.id })
    )

    return inserted.length > 0
  }
)

export const forgetStripeEvent = Effect.fn("ShopStore.forgetStripeEvent")(
  function* (id: string) {
    yield* databaseOperation("release-stripe-event", (db) =>
      db.delete(stripeEvent).where(eq(stripeEvent.id, id))
    )
  }
)
