import type { ShopProduct } from "@/lib/shop/types"

export const shopCatalog: Array<ShopProduct> = [
  {
    id: "founder-lifetime",
    slug: "founder-lifetime",
    name: "Founder",
    summary:
      "A permanent supporter rank. One payment, yours forever.",
    kind: "one_time_rank",
    priceLabel: "€19",
    highlights: [
      "Permanent in-game rank",
      "Supporter chat color and prefix",
      "No renewals, no expiry",
    ],
  },
  {
    id: "legend-lifetime",
    slug: "legend-lifetime",
    name: "Legend",
    summary:
      "Our premium lifetime tier. All supporter perks plus bigger cosmetic and gameplay bonuses.",
    kind: "one_time_rank",
    priceLabel: "€39",
    highlights: [
      "Everything in Founder",
      "Exclusive cosmetics and chat effects",
      "Priority slot when the server is full",
    ],
  },
  {
    id: "sentinel-monthly",
    slug: "sentinel-monthly",
    name: "Sentinel",
    summary:
      "A recurring rank that grants perks while active. Cancel anytime.",
    kind: "subscription_rank",
    priceLabel: "€6 / month",
    highlights: [
      "Active while subscribed",
      "Exclusive monthly cosmetic",
      "Cancel whenever you like",
    ],
  },
  {
    id: "network-plus-monthly",
    slug: "network-plus-monthly",
    name: "Network Plus",
    summary:
      "Our top-tier monthly membership. Maximum perks across the whole network.",
    kind: "subscription_rank",
    priceLabel: "€12 / month",
    highlights: [
      "All premium perks",
      "VIP queue on every server",
      "Early access to new features",
    ],
  },
]

export function getShopProduct(productId: string) {
  return shopCatalog.find((product) => product.id === productId) ?? null
}
