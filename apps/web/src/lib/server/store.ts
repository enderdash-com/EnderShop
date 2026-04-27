import { and, eq, ne } from "drizzle-orm"
import type { CustomerProfile } from "@/lib/shop/types"
import { getDb } from "@/lib/server/db"
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

export async function getCustomerProfile(userId: string) {
  const [row] = await getDb()
    .select({
      minecraftUsername: customerProfile.minecraftUsername,
      minecraftUuid: customerProfile.minecraftUuid,
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
      minecraftUuid: null,
      stripeCustomerId: null,
      updatedAt: timestamp,
      userId,
    })
    .onConflictDoNothing({ target: customerProfile.userId })

  return getCustomerProfile(userId)
}

export async function updateCustomerProfile(input: {
  minecraftUsername: string
  minecraftUuid: string
  userId: string
}) {
  await ensureCustomerProfile(input.userId)

  const conflicts = await getDb()
    .select({ userId: customerProfile.userId })
    .from(customerProfile)
    .where(
      and(
        eq(customerProfile.minecraftUuid, input.minecraftUuid),
        ne(customerProfile.userId, input.userId)
      )
    )
    .limit(1)

  if (conflicts.length > 0) {
    throw new Error(
      "That Minecraft account is already linked to another shop account."
    )
  }

  const timestamp = nowIso()

  await getDb()
    .update(customerProfile)
    .set({
      minecraftUsername: input.minecraftUsername,
      minecraftUuid: input.minecraftUuid,
      updatedAt: timestamp,
    })
    .where(eq(customerProfile.userId, input.userId))

  return getCustomerProfile(input.userId)
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

  if (!previous.updatedAt) {
    return
  }

  const existing = await getCustomerProfile(input.newUserId)
  const timestamp = nowIso()

  if (existing.updatedAt) {
    const merged = {
      minecraftUsername:
        existing.minecraftUsername ?? previous.minecraftUsername,
      minecraftUuid: existing.minecraftUuid ?? previous.minecraftUuid,
      stripeCustomerId:
        existing.stripeCustomerId ?? previous.stripeCustomerId,
    }

    const changed =
      merged.minecraftUsername !== existing.minecraftUsername ||
      merged.minecraftUuid !== existing.minecraftUuid ||
      merged.stripeCustomerId !== existing.stripeCustomerId

    if (changed) {
      if (
        merged.minecraftUuid &&
        merged.minecraftUuid !== existing.minecraftUuid
      ) {
        const conflicts = await getDb()
          .select({ userId: customerProfile.userId })
          .from(customerProfile)
          .where(
            and(
              eq(customerProfile.minecraftUuid, merged.minecraftUuid),
              ne(customerProfile.userId, input.newUserId)
            )
          )
          .limit(1)

        if (conflicts.length > 0) {
          merged.minecraftUsername = existing.minecraftUsername
          merged.minecraftUuid = existing.minecraftUuid
        }
      }

      await getDb()
        .update(customerProfile)
        .set({ ...merged, updatedAt: timestamp })
        .where(eq(customerProfile.userId, input.newUserId))
    }
  } else {
    await getDb()
      .insert(customerProfile)
      .values({
        createdAt: previous.updatedAt,
        minecraftUsername: previous.minecraftUsername,
        minecraftUuid: previous.minecraftUuid,
        stripeCustomerId: previous.stripeCustomerId,
        updatedAt: timestamp,
        userId: input.newUserId,
      })
      .onConflictDoNothing({ target: customerProfile.userId })
  }

  await getDb()
    .delete(customerProfile)
    .where(eq(customerProfile.userId, input.previousUserId))
}

export async function recordStripeEvent(input: { id: string; type: string }) {
  const inserted = await getDb()
    .insert(stripeEvent)
    .values({
      id: input.id,
      processedAt: nowIso(),
      type: input.type,
    })
    .onConflictDoNothing({ target: stripeEvent.id })
    .returning({ id: stripeEvent.id })

  return inserted.length > 0
}

export async function forgetStripeEvent(id: string) {
  await getDb().delete(stripeEvent).where(eq(stripeEvent.id, id))
}
