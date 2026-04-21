export type RankTier = "prime" | "elite" | "apex"

export type ProductKind = "base_rank" | "rank_upgrade" | "ultra_subscription"

export interface ShopProduct {
  id: string
  name: string
  summary: string
  kind: ProductKind
  priceLabel: string
  highlights: Array<string>
  tier: RankTier
  fromTier?: RankTier
}

export interface CustomerProfile {
  minecraftUsername: string | null
  minecraftUuid: string | null
  stripeCustomerId: string | null
  updatedAt: string | null
}

export interface PurchaseRecord {
  id: string
  productId: string
  productName: string
  productKind: ProductKind
  amountLabel: string
  status: string
  createdAt: string
  minecraftUuid: string | null
}

export interface RankStateSnapshot {
  currentTier: RankTier | null
  activeUltra: RankTier | null
  groups: Array<string>
}
