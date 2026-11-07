import { Effect } from "effect"
import type { ShopProduct } from "@/lib/shop/types"
import { getShopProduct } from "@/lib/shop/catalog"
import { BASE_TIER_GROUPS, ULTRA_TIER_GROUPS } from "@/lib/server/shop-state"
import { setting, ShopInputError } from "./shop-services"

interface ServerProductConfig {
  grantCommands: Array<string>
  revokeCommands: Array<string>
  priceEnvVar: string
}

interface ResolvedProductConfig {
  commands: ServerProductConfig
  priceId: string
  product: ShopProduct
  target: {
    organizationId: string
    serverId: string
  }
}

const PRICE_ENV: Record<string, string> = {
  prime: "STRIPE_PRICE_PRIME",
  elite: "STRIPE_PRICE_ELITE",
  apex: "STRIPE_PRICE_APEX",
  upgrade_prime_elite: "STRIPE_PRICE_UPGRADE_PRIME_ELITE",
  upgrade_prime_apex: "STRIPE_PRICE_UPGRADE_PRIME_APEX",
  upgrade_elite_apex: "STRIPE_PRICE_UPGRADE_ELITE_APEX",
  prime_ultra: "STRIPE_PRICE_PRIME_ULTRA",
  elite_ultra: "STRIPE_PRICE_ELITE_ULTRA",
  legend: "STRIPE_PRICE_LEGEND",
}

function buildCommands(product: ShopProduct): ServerProductConfig {
  const priceEnvVar = PRICE_ENV[product.id]
  if (!priceEnvVar) {
    throw new Error(`Missing Stripe price mapping for product ${product.id}`)
  }

  if (product.kind === "base_rank") {
    return {
      grantCommands: [
        `lp user {{uuid}} parent set ${BASE_TIER_GROUPS[product.tier]}`,
      ],
      revokeCommands: [],
      priceEnvVar,
    }
  }

  if (product.kind === "rank_upgrade") {
    return {
      grantCommands: [
        `lp user {{uuid}} parent set ${BASE_TIER_GROUPS[product.tier]}`,
      ],
      revokeCommands: [],
      priceEnvVar,
    }
  }

  return {
    grantCommands: [
      `lp user {{uuid}} parent add ${ULTRA_TIER_GROUPS[product.tier]}`,
    ],
    revokeCommands: [
      `lp user {{uuid}} parent remove ${ULTRA_TIER_GROUPS[product.tier]}`,
    ],
    priceEnvVar,
  }
}

export const resolveProductConfig = Effect.fn("Shop.resolveProductConfig")(
  function* (productId: string) {
    const product = getShopProduct(productId)
    if (!product) {
      return yield* new ShopInputError({
        message: `Unknown product: ${productId}`,
      })
    }

    const commands = yield* Effect.try({
      try: () => buildCommands(product),
      catch: () =>
        new ShopInputError({
          message: `Missing Stripe price mapping for product ${product.id}`,
        }),
    })

    const config: ResolvedProductConfig = {
      commands,
      priceId: yield* setting(commands.priceEnvVar),
      product,
      target: {
        organizationId: yield* setting("ENDERDASH_ORGANIZATION_ID"),
        serverId: yield* setting("ENDERDASH_SERVER_ID"),
      },
    }
    return config
  }
)

export function isSubscriptionProduct(product: ShopProduct) {
  return product.kind === "ultra_subscription"
}

export function renderCommand(
  template: string,
  vars: { uuid: string; username: string }
) {
  return template
    .replaceAll("{{uuid}}", vars.uuid)
    .replaceAll("{{username}}", vars.username)
}
