import type {
  RankStateSnapshot,
  RankTier,
  ShopProduct,
} from "@/lib/shop/types"
import { getShopProduct, shopCatalog } from "@/lib/shop/catalog"
import { getLuckPermsSnapshot } from "@/lib/server/enderdash"

export const BASE_TIER_GROUPS: Record<RankTier, string> = {
  prime: "prime",
  elite: "elite",
  apex: "apex",
}

export const ULTRA_TIER_GROUPS: Record<RankTier, string> = {
  prime: "prime_ultra",
  elite: "elite_ultra",
  apex: "legend",
}

const TIER_RANK: Record<RankTier, number> = {
  prime: 1,
  elite: 2,
  apex: 3,
}

export function deriveRankStateFromGroups(
  groups: Array<string>
): RankStateSnapshot {
  const set = new Set(groups)
  const currentTier: RankTier | null = set.has(BASE_TIER_GROUPS.apex)
    ? "apex"
    : set.has(BASE_TIER_GROUPS.elite)
      ? "elite"
      : set.has(BASE_TIER_GROUPS.prime)
        ? "prime"
        : null

  const activeUltra: RankTier | null = set.has(ULTRA_TIER_GROUPS.apex)
    ? "apex"
    : set.has(ULTRA_TIER_GROUPS.elite)
      ? "elite"
      : set.has(ULTRA_TIER_GROUPS.prime)
        ? "prime"
        : null

  return { currentTier, activeUltra, groups }
}

export async function getRankStateByUuid(uuid: string): Promise<RankStateSnapshot> {
  try {
    const snapshot = await getLuckPermsSnapshot({ uuid })
    if (!snapshot?.user) {
      return { currentTier: null, activeUltra: null, groups: [] }
    }

    const groups = snapshot.user.groups.map((group) => group.name)
    if (snapshot.user.primary_group && !groups.includes(snapshot.user.primary_group)) {
      groups.push(snapshot.user.primary_group)
    }

    return deriveRankStateFromGroups(groups)
  } catch {
    return { currentTier: null, activeUltra: null, groups: [] }
  }
}

export function isProductEligible(
  product: ShopProduct,
  state: RankStateSnapshot
): boolean {
  if (product.kind === "base_rank") {
    return state.currentTier === null
  }

  if (product.kind === "rank_upgrade") {
    if (!product.fromTier) return false
    if (state.currentTier !== product.fromTier) return false
    return TIER_RANK[product.tier] > TIER_RANK[product.fromTier]
  }

  if (product.kind === "ultra_subscription") {
    return state.currentTier === product.tier && state.activeUltra === null
  }

  return false
}

export function getEligibleProducts(state: RankStateSnapshot) {
  return shopCatalog.filter((product) => isProductEligible(product, state))
}

export function requireEligibleProduct(
  productId: string,
  state: RankStateSnapshot
) {
  const product = getShopProduct(productId)
  if (!product) {
    throw new Error("Unknown product")
  }

  if (!isProductEligible(product, state)) {
    throw new Error(
      "This rank is not available for your current account state."
    )
  }

  return product
}
