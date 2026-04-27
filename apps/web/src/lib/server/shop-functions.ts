import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import * as z from "zod"
import type {
  CustomerProfile,
  PurchaseRecord,
  RankStateSnapshot,
  ShopProduct,
} from "@/lib/shop/types"
import { shopCatalog } from "@/lib/shop/catalog"
import { getSessionFromHeaders } from "@/lib/server/auth"
import { resolveMinecraftUsername } from "@/lib/server/enderdash"
import {
  getEligibleProducts,
  getRankStateByUuid,
  requireEligibleProduct,
} from "@/lib/server/shop-state"
import {
  createBillingPortalSession,
  createCheckoutSession,
  listCustomerPurchases,
} from "@/lib/server/stripe"
import {
  ensureCustomerProfile,
  getCustomerProfile,
  updateCustomerProfile,
} from "@/lib/server/store"

const usernamePattern = /^[A-Za-z0-9_]{3,16}$/

export interface ShopStatePayload {
  profile: CustomerProfile
  rankState: RankStateSnapshot
  eligibleProductIds: Array<string>
  catalog: Array<ShopProduct>
  purchases: Array<PurchaseRecord>
}

async function requireSession() {
  const request = getRequest()
  const session = await getSessionFromHeaders(request.headers)
  if (!session) {
    throw new Error("Unauthorized")
  }
  return { session, request }
}

async function requireRegisteredSession() {
  const result = await requireSession()
  const isAnonymous = Boolean(
    (result.session.user as { isAnonymous?: boolean | null }).isAnonymous
  )
  if (isAnonymous) {
    throw new Error("Create an account before purchasing.")
  }
  return result
}

export const getShopState = createServerFn({ method: "GET" }).handler(
  async (): Promise<ShopStatePayload> => {
    const { session } = await requireSession()
    const profile = await ensureCustomerProfile(session.user.id)

    const rankState = profile.minecraftUuid
      ? await getRankStateByUuid(profile.minecraftUuid)
      : { currentTier: null, activeUltra: null, groups: [] }

    const eligibleProducts = profile.minecraftUuid
      ? getEligibleProducts(rankState)
      : []

    const purchases = profile.stripeCustomerId
      ? await listCustomerPurchases(profile.stripeCustomerId)
      : []

    return {
      profile,
      rankState,
      eligibleProductIds: eligibleProducts.map((product) => product.id),
      catalog: shopCatalog,
      purchases,
    }
  }
)

const saveProfileSchema = z.object({
  minecraftUsername: z
    .string()
    .trim()
    .regex(
      usernamePattern,
      "Use 3-16 characters: letters, numbers, or underscores."
    ),
})

export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator(saveProfileSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSession()

    let lookup
    try {
      lookup = await resolveMinecraftUsername(data.minecraftUsername)
    } catch {
      throw new Error(
        "Could not verify that Minecraft username right now. Try again shortly."
      )
    }

    if (!lookup || !lookup.found || !lookup.uuid) {
      throw new Error(
        "That Minecraft username could not be found on the server."
      )
    }

    const resolvedUsername = lookup.username ?? data.minecraftUsername
    const resolvedUuid = lookup.uuid

    return updateCustomerProfile({
      minecraftUsername: resolvedUsername,
      minecraftUuid: resolvedUuid,
      userId: session.user.id,
    })
  })

const startCheckoutSchema = z.object({
  productId: z.string().min(1),
})

export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator(startCheckoutSchema)
  .handler(async ({ data }) => {
    const { session, request } = await requireRegisteredSession()
    const profile = await getCustomerProfile(session.user.id)

    if (!profile.minecraftUsername || !profile.minecraftUuid) {
      throw new Error("Link your Minecraft username before checkout.")
    }

    const rankState = await getRankStateByUuid(profile.minecraftUuid)
    const product = requireEligibleProduct(data.productId, rankState)

    return createCheckoutSession({
      product,
      request,
      user: {
        email: session.user.email,
        id: session.user.id,
      },
      uuid: profile.minecraftUuid,
      username: profile.minecraftUsername,
    })
  })

export const openBillingPortal = createServerFn({ method: "POST" }).handler(
  async () => {
    const { session, request } = await requireRegisteredSession()
    return createBillingPortalSession({
      request,
      userId: session.user.id,
    })
  }
)
