import type { ShopProduct } from "@/lib/shop/types"

export const shopCatalog: ShopProduct[] = [
  {
    id: "founder-lifetime",
    slug: "founder-lifetime",
    name: "Founder Rank",
    summary: "A permanent supporter rank with no renewal and no expiry.",
    kind: "one_time_rank",
    priceLabel: "€19 once",
    highlights: [
      "Permanent rank grant",
      "Ideal for one-off support campaigns",
      "Fulfilled through EnderDash console execution",
    ],
  },
  {
    id: "legend-lifetime",
    slug: "legend-lifetime",
    name: "Legend Rank",
    summary:
      "A higher permanent rank for communities that want a premium one-time tier.",
    kind: "one_time_rank",
    priceLabel: "€39 once",
    highlights: [
      "Permanent rank grant",
      "Higher-value supporter tier",
      "Single payment through Stripe Checkout",
    ],
  },
  {
    id: "sentinel-monthly",
    slug: "sentinel-monthly",
    name: "Sentinel Pass",
    summary:
      "A recurring rank with automatic activation and cancellation-aware revocation.",
    kind: "subscription_rank",
    priceLabel: "€6 / month",
    highlights: [
      "Recurring Stripe subscription",
      "Grant on activation",
      "Revoke when the subscription stops being active",
    ],
  },
  {
    id: "network-plus-monthly",
    slug: "network-plus-monthly",
    name: "Network Plus",
    summary:
      "A higher recurring rank for servers that want an ongoing premium membership tier.",
    kind: "subscription_rank",
    priceLabel: "€12 / month",
    highlights: [
      "Recurring premium rank",
      "Customer portal support",
      "Webhook-driven fulfillment sync",
    ],
  },
]

export function getShopProduct(productId: string) {
  return shopCatalog.find((product) => product.id === productId) ?? null
}
