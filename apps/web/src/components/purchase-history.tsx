import { CheckCircle, Crown, Gem, Shield, Sparkles } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import type { LucideIcon } from "lucide-react"
import type { RankEntitlement } from "@/lib/shop/types"
import { getShopProduct } from "@/lib/shop/catalog"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value))
}

const productIcons: Record<string, LucideIcon> = {
  "founder-lifetime": Gem,
  "legend-lifetime": Crown,
  "sentinel-monthly": Shield,
  "network-plus-monthly": Sparkles,
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "active") return "default"
  if (status === "pending") return "secondary"
  if (status === "past_due") return "outline"
  return "destructive"
}

export function PurchaseHistory({
  entitlements,
}: {
  entitlements: Array<RankEntitlement>
}) {
  if (entitlements.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-dashed border-border px-6 py-10 text-center">
        <CheckCircle className="size-5 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">No ranks yet</p>
          <p className="text-xs text-muted-foreground">
            Your purchase history will appear here once checkout completes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border border border-border">
      {entitlements.map((entitlement) => {
        const product = getShopProduct(entitlement.productId)
        const Icon = productIcons[entitlement.productId] ?? Gem

        return (
          <li
            className="flex items-center gap-4 px-4 py-3.5"
            key={entitlement.id}
          >
            <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/60">
              <Icon className="size-4" />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {product?.name ?? entitlement.productId}
                </span>
                <Badge variant={statusVariant(entitlement.status)}>
                  {entitlement.status.replaceAll("_", " ")}
                </Badge>
              </div>
              <span className="truncate text-xs text-muted-foreground">
                {entitlement.minecraftUsername} &middot; {formatDate(entitlement.createdAt)}
              </span>
            </div>

            <span className="hidden shrink-0 text-[10px] tracking-[0.24em] text-muted-foreground uppercase sm:inline">
              {entitlement.productKind === "subscription_rank" ? "Subscription" : "Lifetime"}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
