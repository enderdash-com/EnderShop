import { and, count, desc, eq, inArray } from "drizzle-orm"
import type { CustomerProfile, RankEntitlement } from "@/lib/shop/types"
import { getDb } from "@/lib/server/db"
import {
  customerProfile,
  fulfillmentLog,
  rankEntitlement,
  stripeEvent,
} from "@/lib/server/schema"

function nowIso() {
  return new Date().toISOString()
}

function mapProfileRow(
  row:
    | {
        minecraftUsername: string | null
        stripeCustomerId: string | null
        updatedAt: string
      }
    | undefined
): CustomerProfile {
  return {
    minecraftUsername: row?.minecraftUsername ?? null,
    stripeCustomerId: row?.stripeCustomerId ?? null,
    updatedAt: row?.updatedAt ?? null,
  }
}

function mapEntitlementRow(
  row:
    | {
        canceledAt: string | null
        createdAt: string
        fulfillmentStatus: string
        id: string
        minecraftUsername: string
        productId: string
        productKind: string
        status: string
        updatedAt: string
        userId: string
      }
    | undefined
): RankEntitlement | null {
  if (!row) {
    return null
  }

  const productKind =
    row.productKind === "subscription_rank"
      ? "subscription_rank"
      : "one_time_rank"

  return {
    id: row.id,
    userId: row.userId,
    productId: row.productId,
    productKind,
    minecraftUsername: row.minecraftUsername,
    status: row.status,
    fulfillmentStatus: row.fulfillmentStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    canceledAt: row.canceledAt,
  }
}

export async function getCustomerProfile(userId: string) {
  const [row] = await getDb()
    .select({
      minecraftUsername: customerProfile.minecraftUsername,
      stripeCustomerId: customerProfile.stripeCustomerId,
      updatedAt: customerProfile.updatedAt,
    })
    .from(customerProfile)
    .where(eq(customerProfile.userId, userId))
    .limit(1)

  return mapProfileRow(row)
}

export async function ensureCustomerProfile(userId: string) {
  const existing = await getCustomerProfile(userId)
  if (existing.updatedAt) {
    return existing
  }

  const timestamp = nowIso()

  await getDb()
    .insert(customerProfile)
    .values({
      createdAt: timestamp,
      minecraftUsername: null,
      stripeCustomerId: null,
      updatedAt: timestamp,
      userId,
    })
    .onConflictDoNothing({ target: customerProfile.userId })

  return getCustomerProfile(userId)
}

export async function updateCustomerProfile(input: {
  minecraftUsername: string
  userId: string
}) {
  await ensureCustomerProfile(input.userId)
  const timestamp = nowIso()

  await getDb()
    .update(customerProfile)
    .set({
      minecraftUsername: input.minecraftUsername,
      updatedAt: timestamp,
    })
    .where(eq(customerProfile.userId, input.userId))

  return {
    minecraftUsername: input.minecraftUsername,
    stripeCustomerId: (await getCustomerProfile(input.userId)).stripeCustomerId,
    updatedAt: timestamp,
  }
}

export async function setStripeCustomerId(input: {
  stripeCustomerId: string
  userId: string
}) {
  await ensureCustomerProfile(input.userId)

  await getDb()
    .update(customerProfile)
    .set({
      stripeCustomerId: input.stripeCustomerId,
      updatedAt: nowIso(),
    })
    .where(eq(customerProfile.userId, input.userId))

  return getCustomerProfile(input.userId)
}

export async function reassignAnonymousUserData(input: {
  newUserId: string
  previousUserId: string
}) {
  const previous = await getCustomerProfile(input.previousUserId)

  if (previous.updatedAt) {
    const timestamp = nowIso()

    await getDb()
      .insert(customerProfile)
      .values({
        createdAt: previous.updatedAt,
        minecraftUsername: previous.minecraftUsername,
        stripeCustomerId: previous.stripeCustomerId,
        updatedAt: timestamp,
        userId: input.newUserId,
      })
      .onConflictDoUpdate({
        set: {
          minecraftUsername: previous.minecraftUsername,
          stripeCustomerId: previous.stripeCustomerId,
          updatedAt: timestamp,
        },
        target: customerProfile.userId,
      })

    await getDb()
      .delete(customerProfile)
      .where(eq(customerProfile.userId, input.previousUserId))
  }

  await getDb()
    .update(rankEntitlement)
    .set({
      updatedAt: nowIso(),
      userId: input.newUserId,
    })
    .where(eq(rankEntitlement.userId, input.previousUserId))
}

export async function listEntitlementsForUser(userId: string) {
  const rows = await getDb()
    .select({
      canceledAt: rankEntitlement.canceledAt,
      createdAt: rankEntitlement.createdAt,
      fulfillmentStatus: rankEntitlement.fulfillmentStatus,
      id: rankEntitlement.id,
      minecraftUsername: rankEntitlement.minecraftUsername,
      productId: rankEntitlement.productId,
      productKind: rankEntitlement.productKind,
      status: rankEntitlement.status,
      updatedAt: rankEntitlement.updatedAt,
      userId: rankEntitlement.userId,
    })
    .from(rankEntitlement)
    .where(eq(rankEntitlement.userId, userId))
    .orderBy(desc(rankEntitlement.createdAt))

  return rows
    .map((row) => mapEntitlementRow(row))
    .filter((row): row is RankEntitlement => row !== null)
}

export async function findEntitlementBySubscriptionId(
  stripeSubscriptionId: string
) {
  const [row] = await getDb()
    .select()
    .from(rankEntitlement)
    .where(eq(rankEntitlement.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1)

  return mapEntitlementRow(row)
}

export async function findEntitlementByCheckoutSessionId(
  stripeCheckoutSessionId: string
) {
  const [row] = await getDb()
    .select()
    .from(rankEntitlement)
    .where(eq(rankEntitlement.stripeCheckoutSessionId, stripeCheckoutSessionId))
    .limit(1)

  return mapEntitlementRow(row)
}

export async function findEntitlementById(id: string) {
  const [row] = await getDb()
    .select()
    .from(rankEntitlement)
    .where(eq(rankEntitlement.id, id))
    .limit(1)

  return mapEntitlementRow(row)
}

export async function countActiveEntitlements(input: {
  productId: string
  userId: string
}) {
  const [row] = await getDb()
    .select({ value: count() })
    .from(rankEntitlement)
    .where(
      and(
        eq(rankEntitlement.userId, input.userId),
        eq(rankEntitlement.productId, input.productId),
        inArray(rankEntitlement.status, ["pending", "active", "past_due"])
      )
    )

  return row?.value ?? 0
}

export async function upsertEntitlement(input: {
  fulfillmentStatus?: string
  minecraftUsername: string
  productId: string
  productKind: RankEntitlement["productKind"]
  status: string
  stripeCheckoutSessionId?: string | null
  stripeCustomerId?: string | null
  stripeInvoiceId?: string | null
  stripePaymentIntentId?: string | null
  stripeSubscriptionId?: string | null
  userId: string
}) {
  const existing = input.stripeSubscriptionId
    ? await findEntitlementBySubscriptionId(input.stripeSubscriptionId)
    : input.stripeCheckoutSessionId
      ? await findEntitlementByCheckoutSessionId(input.stripeCheckoutSessionId)
      : null

  const timestamp = nowIso()

  if (existing) {
    await getDb()
      .update(rankEntitlement)
      .set({
        canceledAt:
          input.status === "canceled" || input.status === "revoked"
            ? existing.canceledAt ?? timestamp
            : null,
        fulfillmentStatus: input.fulfillmentStatus ?? existing.fulfillmentStatus,
        minecraftUsername: input.minecraftUsername,
        productId: input.productId,
        productKind: input.productKind,
        status: input.status,
        stripeCheckoutSessionId:
          input.stripeCheckoutSessionId ?? existing.id,
        stripeCustomerId: input.stripeCustomerId ?? null,
        stripeInvoiceId: input.stripeInvoiceId ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        stripeSubscriptionId: input.stripeSubscriptionId ?? null,
        updatedAt: timestamp,
        userId: input.userId,
      })
      .where(eq(rankEntitlement.id, existing.id))

    return findEntitlementById(existing.id)
  }

  const id = crypto.randomUUID()

  await getDb().insert(rankEntitlement).values({
    canceledAt:
      input.status === "canceled" || input.status === "revoked"
        ? timestamp
        : null,
    createdAt: timestamp,
    fulfillmentStatus: input.fulfillmentStatus ?? "pending",
    id,
    minecraftUsername: input.minecraftUsername,
    productId: input.productId,
    productKind: input.productKind,
    status: input.status,
    stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
    stripeCustomerId: input.stripeCustomerId ?? null,
    stripeInvoiceId: input.stripeInvoiceId ?? null,
    stripePaymentIntentId: input.stripePaymentIntentId ?? null,
    stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    updatedAt: timestamp,
    userId: input.userId,
  })

  return findEntitlementById(id)
}

export async function updateEntitlementFulfillment(input: {
  commandError?: string | null
  commandResult?: string | null
  entitlementId: string
  fulfillmentStatus: string
}) {
  await getDb()
    .update(rankEntitlement)
    .set({
      commandError: input.commandError ?? null,
      commandResult: input.commandResult ?? null,
      fulfillmentStatus: input.fulfillmentStatus,
      lastFulfilledAt: nowIso(),
      updatedAt: nowIso(),
    })
    .where(eq(rankEntitlement.id, input.entitlementId))
}

export async function recordStripeEvent(input: { id: string; type: string }) {
  const [existing] = await getDb()
    .select({ id: stripeEvent.id })
    .from(stripeEvent)
    .where(eq(stripeEvent.id, input.id))
    .limit(1)

  if (existing) {
    return false
  }

  await getDb().insert(stripeEvent).values({
    id: input.id,
    processedAt: nowIso(),
    type: input.type,
  })

  return true
}

export async function createFulfillmentLog(input: {
  command: string
  entitlementId: string
  outcome: string
  phase: string
  responseJson?: string | null
}) {
  await getDb().insert(fulfillmentLog).values({
    command: input.command,
    createdAt: nowIso(),
    entitlementId: input.entitlementId,
    id: crypto.randomUUID(),
    outcome: input.outcome,
    phase: input.phase,
    responseJson: input.responseJson ?? null,
  })
}
