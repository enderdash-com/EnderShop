export type ProductKind = "one_time_rank" | "subscription_rank"

export interface ShopProduct {
  id: string
  slug: string
  name: string
  summary: string
  kind: ProductKind
  priceLabel: string
  highlights: Array<string>
}

export interface CustomerProfile {
  minecraftUsername: string | null
  stripeCustomerId: string | null
  updatedAt: string | null
}

export interface RankEntitlement {
  id: string
  userId: string
  productId: string
  productKind: ProductKind
  minecraftUsername: string
  status: string
  fulfillmentStatus: string
  createdAt: string
  updatedAt: string
  canceledAt: string | null
}
