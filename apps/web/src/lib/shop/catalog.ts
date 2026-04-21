import type { RankTier, ShopProduct } from "@/lib/shop/types"

export const shopCatalog: Array<ShopProduct> = [
  {
    id: "prime",
    name: "Prime",
    summary: "Start your support with a permanent entry-tier rank.",
    kind: "base_rank",
    priceLabel: "€5",
    tier: "prime",
    highlights: [
      "Permanent in-game rank",
      "Supporter chat tag",
      "Unlocks Prime Ultra subscription",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    summary: "Our mid-tier lifetime rank for regular supporters.",
    kind: "base_rank",
    priceLabel: "€10",
    tier: "elite",
    highlights: [
      "Everything in Prime",
      "Extra cosmetics and chat effects",
      "Unlocks Elite Ultra subscription",
    ],
  },
  {
    id: "apex",
    name: "Apex",
    summary: "The top permanent rank. One payment, the whole network.",
    kind: "base_rank",
    priceLabel: "€15",
    tier: "apex",
    highlights: [
      "Everything in Elite",
      "Priority slot when the server is full",
      "Unlocks Legend subscription",
    ],
  },
  {
    id: "upgrade_prime_elite",
    name: "Upgrade to Elite",
    summary: "Pay the difference to move up from Prime to Elite.",
    kind: "rank_upgrade",
    priceLabel: "€5",
    tier: "elite",
    fromTier: "prime",
    highlights: [
      "Keeps your support history",
      "Replaces Prime with Elite",
      "Cancels any active Prime Ultra subscription",
    ],
  },
  {
    id: "upgrade_prime_apex",
    name: "Upgrade to Apex",
    summary: "Jump straight from Prime to Apex for the difference.",
    kind: "rank_upgrade",
    priceLabel: "€10",
    tier: "apex",
    fromTier: "prime",
    highlights: [
      "Keeps your support history",
      "Replaces Prime with Apex",
      "Cancels any active Prime Ultra subscription",
    ],
  },
  {
    id: "upgrade_elite_apex",
    name: "Upgrade to Apex",
    summary: "Move up from Elite to Apex for the difference.",
    kind: "rank_upgrade",
    priceLabel: "€5",
    tier: "apex",
    fromTier: "elite",
    highlights: [
      "Keeps your support history",
      "Replaces Elite with Apex",
      "Cancels any active Elite Ultra subscription",
    ],
  },
  {
    id: "prime_ultra",
    name: "Prime Ultra",
    summary: "Recurring perks layered on top of Prime. Cancel anytime.",
    kind: "ultra_subscription",
    priceLabel: "€5 / month",
    tier: "prime",
    highlights: [
      "Active while subscribed",
      "Monthly cosmetic drop",
      "Requires the Prime base rank",
    ],
  },
  {
    id: "elite_ultra",
    name: "Elite Ultra",
    summary: "Recurring Elite-tier perks. Stack on top of the Elite rank.",
    kind: "ultra_subscription",
    priceLabel: "€10 / month",
    tier: "elite",
    highlights: [
      "Active while subscribed",
      "Elite-only monthly perks",
      "Requires the Elite base rank",
    ],
  },
  {
    id: "legend",
    name: "Legend",
    summary: "Top-tier monthly perks for Apex holders.",
    kind: "ultra_subscription",
    priceLabel: "€15 / month",
    tier: "apex",
    highlights: [
      "VIP queue on every server",
      "Early access to new features",
      "Requires the Apex base rank",
    ],
  },
]

export function getShopProduct(productId: string) {
  return shopCatalog.find((product) => product.id === productId) ?? null
}

export function getBaseRankProduct(tier: RankTier) {
  return shopCatalog.find(
    (product) => product.kind === "base_rank" && product.tier === tier
  ) ?? null
}

export function getUltraProduct(tier: RankTier) {
  return shopCatalog.find(
    (product) =>
      product.kind === "ultra_subscription" && product.tier === tier
  ) ?? null
}

export function getUpgradeProduct(fromTier: RankTier, toTier: RankTier) {
  return shopCatalog.find(
    (product) =>
      product.kind === "rank_upgrade" &&
      product.fromTier === fromTier &&
      product.tier === toTier
  ) ?? null
}
