import { CheckCircle, Crown, Gem, Shield, Sparkles } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import type { LucideIcon } from "lucide-react"
import type { PurchaseRecord } from "@/lib/shop/types"
import { getShopProduct } from "@/lib/shop/catalog"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function iconFor(productId: string): LucideIcon {
  const product = getShopProduct(productId)
  if (!product) return Gem
  if (product.kind === "ultra_subscription") {
    return product.tier === "apex"
      ? Sparkles
      : product.tier === "elite"
        ? Shield
        : Crown
  }
  return product.tier === "apex" ? Crown : product.tier === "elite" ? Shield : Gem
}

function statusVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "active" || status === "paid" || status === "trialing") return "default"
  if (status === "past_due") return "outline"
  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired")
    return "destructive"
  return "secondary"
}

function humanKind(kind: PurchaseRecord["productKind"]) {
  if (kind === "base_rank") return "Lifetime"
  if (kind === "rank_upgrade") return "Upgrade"
  return "Subscription"
}

export function PurchaseHistory({
  purchases,
}: {
  purchases: Array<PurchaseRecord>
}) {
  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-dashed border-border px-6 py-10 text-center">
        <CheckCircle className="size-5 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">No purchases yet</p>
          <p className="text-xs text-muted-foreground">
            Ranks and subscriptions will appear here once checkout completes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border border border-border">
      {purchases.map((record) => {
        const Icon = iconFor(record.productId)

        return (
          <li
            className="flex items-center gap-4 px-4 py-3.5"
            key={record.id}
          >
            <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/60">
              <Icon className="size-4" />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {record.productName}
                </span>
                <Badge variant={statusVariant(record.status)}>
                  {record.status.replaceAll("_", " ")}
                </Badge>
              </div>
              <span className="truncate text-xs text-muted-foreground">
                {record.amountLabel} &middot; {formatDate(record.createdAt)}
              </span>
            </div>

            <span className="hidden shrink-0 text-[10px] tracking-[0.24em] text-muted-foreground uppercase sm:inline">
              {humanKind(record.productKind)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
