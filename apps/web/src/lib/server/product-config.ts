import type { ProductKind, ShopProduct } from "@/lib/shop/types"
import { getShopProduct } from "@/lib/shop/catalog"
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

const serverProductConfig = {
  "founder-lifetime": {
    grantCommands: ["lp user {{minecraftUsername}} parent add founder"],
    revokeCommands: [],
    priceEnvVar: "STRIPE_PRICE_FOUNDER_LIFETIME",
  },
  "legend-lifetime": {
    grantCommands: ["lp user {{minecraftUsername}} parent add legend"],
    revokeCommands: [],
    priceEnvVar: "STRIPE_PRICE_LEGEND_LIFETIME",
  },
  "sentinel-monthly": {
    grantCommands: ["lp user {{minecraftUsername}} parent add sentinel"],
    revokeCommands: ["lp user {{minecraftUsername}} parent remove sentinel"],
    priceEnvVar: "STRIPE_PRICE_SENTINEL_MONTHLY",
  },
  "network-plus-monthly": {
    grantCommands: ["lp user {{minecraftUsername}} parent add networkplus"],
    revokeCommands: ["lp user {{minecraftUsername}} parent remove networkplus"],
    priceEnvVar: "STRIPE_PRICE_NETWORK_PLUS_MONTHLY",
  },
} satisfies Record<string, ServerProductConfig>

function isConfiguredProductId(
  productId: string
): productId is keyof typeof serverProductConfig {
  return productId in serverProductConfig
}

function requireEnv(name: string) {
  return requireStringEnv(name as never)
}

export function resolveProductConfig(productId: string): ResolvedProductConfig {
  const product = getShopProduct(productId)
  if (!product) {
    throw new Error(`Unknown product: ${productId}`)
  }

  if (!isConfiguredProductId(productId)) {
    throw new Error(`Missing fulfillment config for product: ${productId}`)
  }

  const commands = serverProductConfig[productId]

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

export function isSubscriptionKind(kind: ProductKind) {
  return kind === "subscription_rank"
}
