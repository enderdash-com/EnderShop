import type { ShopProduct } from "@/lib/shop/types"
import { getShopProduct } from "@/lib/shop/catalog"
import {
  BASE_TIER_GROUPS,
  ULTRA_TIER_GROUPS,
} from "@/lib/server/shop-state"
import { requireStringEnv } from "@/lib/server/worker-env"

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

function requireEnv(name: string) {
  return requireStringEnv(name as never)
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

export function resolveProductConfig(productId: string): ResolvedProductConfig {
  const product = getShopProduct(productId)
  if (!product) {
    throw new Error(`Unknown product: ${productId}`)
  }

  const commands = buildCommands(product)

  return {
    commands,
    priceId: requireEnv(commands.priceEnvVar),
    product,
    target: {
      organizationId: requireEnv("ENDERDASH_ORGANIZATION_ID"),
      serverId: requireEnv("ENDERDASH_SERVER_ID"),
    },
  }
}

export function isSubscriptionProduct(product: ShopProduct) {
  return product.kind === "ultra_subscription"
}

export function renderCommand(template: string, vars: { uuid: string; username: string }) {
  return template
    .replaceAll("{{uuid}}", vars.uuid)
    .replaceAll("{{username}}", vars.username)
}
