import { Context, Data, Effect } from "effect"
import type {
  CustomerProfile,
  PurchaseRecord,
  RankStateSnapshot,
  ShopProduct,
} from "@/lib/shop/types"
import { shopCatalog } from "@/lib/shop/catalog"
import { resolveMinecraftUsername } from "./enderdash"
import {
  getEligibleProducts,
  getRankStateByUuid,
  requireEligibleProduct,
} from "./shop-state"
import {
  createBillingPortalSession,
  createCheckoutSession,
  listCustomerPurchases,
} from "./stripe"
import {
  ensureCustomerProfile,
  getCustomerProfile,
  updateCustomerProfile,
} from "./store"
import { ShopInputError } from "./shop-services"

export interface ShopUser {
  id: string
  email?: string | null
  isAnonymous?: boolean | null
}
export class ShopSessionError extends Data.TaggedError("ShopSessionError")<{
  readonly cause: unknown
}> {
  override get message() {
    return "Could not load your session. Try again shortly."
  }
}
export class ShopSession extends Context.Service<
  ShopSession,
  {
    readonly current: Effect.Effect<ShopUser | null, ShopSessionError>
  }
>()("endershop/ShopSession") {}

export interface ShopStatePayload {
  profile: CustomerProfile
  rankState: RankStateSnapshot
  eligibleProductIds: Array<string>
  catalog: Array<ShopProduct>
  purchases: Array<PurchaseRecord>
}

const requireUser = Effect.fn("Shop.requireUser")(function* (
  registered = false
) {
  const session = yield* ShopSession
  const user = yield* session.current
  if (!user) return yield* new ShopInputError({ message: "Unauthorized" })
  if (registered && user.isAnonymous)
    return yield* new ShopInputError({
      message: "Create an account before purchasing.",
    })
  return user
})

export const loadShopState = Effect.fn("Shop.loadShopState")(function* () {
  const user = yield* requireUser()
  const profile = yield* ensureCustomerProfile(user.id)
  const rankState = profile.minecraftUuid
    ? yield* getRankStateByUuid(profile.minecraftUuid)
    : { currentTier: null, activeUltra: null, groups: [] }
  const purchases = profile.stripeCustomerId
    ? yield* listCustomerPurchases(profile.stripeCustomerId)
    : []
  return {
    profile,
    rankState,
    eligibleProductIds: profile.minecraftUuid
      ? getEligibleProducts(rankState).map((product) => product.id)
      : [],
    catalog: shopCatalog,
    purchases,
  } satisfies ShopStatePayload
})

export const saveShopProfile = Effect.fn("Shop.saveShopProfile")(function* (
  minecraftUsername: string
) {
  const user = yield* requireUser()
  const lookup = yield* resolveMinecraftUsername(minecraftUsername).pipe(
    Effect.mapError(
      () =>
        new ShopInputError({
          message:
            "Could not verify that Minecraft username right now. Try again shortly.",
        })
    )
  )
  if (!lookup?.found || !lookup.uuid)
    return yield* new ShopInputError({
      message: "That Minecraft username could not be found on the server.",
    })
  return yield* updateCustomerProfile({
    minecraftUsername: lookup.username ?? minecraftUsername,
    minecraftUuid: lookup.uuid,
    userId: user.id,
  })
})

export const beginShopCheckout = Effect.fn("Shop.beginShopCheckout")(function* (
  productId: string,
  request: Request
) {
  const user = yield* requireUser(true)
  const profile = yield* getCustomerProfile(user.id)
  if (!profile.minecraftUsername || !profile.minecraftUuid)
    return yield* new ShopInputError({
      message: "Link your Minecraft username before checkout.",
    })
  const rankState = yield* getRankStateByUuid(profile.minecraftUuid)
  const product = yield* requireEligibleProduct(productId, rankState)
  return yield* createCheckoutSession({
    product,
    request,
    user,
    uuid: profile.minecraftUuid,
    username: profile.minecraftUsername,
  })
})

export const openShopBillingPortal = Effect.fn("Shop.openShopBillingPortal")(
  function* (request: Request) {
    const user = yield* requireUser(true)
    return yield* createBillingPortalSession({ request, userId: user.id })
  }
)
