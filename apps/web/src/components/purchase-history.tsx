import { getShopProduct } from "@/lib/shop/catalog"
import type { RankEntitlement } from "@/lib/shop/types"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function statusVariant(status: string) {
  if (status === "active") return "default"
  if (status === "pending") return "secondary"
  if (status === "past_due") return "outline"
  return "destructive"
}

export function PurchaseHistory({
  entitlements,
}: {
  entitlements: RankEntitlement[]
}) {
  if (entitlements.length === 0) {
    return (
      <div className="border border-border/70 bg-card px-6 py-8 text-sm text-muted-foreground">
        No purchases yet. Pick a rank from the catalog to create the first
        entitlement for this account.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Fulfillment</TableHead>
          <TableHead>Player</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entitlements.map((entitlement) => {
          const product = getShopProduct(entitlement.productId)

          return (
            <TableRow key={entitlement.id}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    {product?.name ?? entitlement.productId}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entitlement.productKind === "one_time_rank"
                      ? "One-time rank"
                      : "Subscription rank"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(entitlement.status)}>
                  {entitlement.status.replaceAll("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {entitlement.fulfillmentStatus.replaceAll("_", " ")}
              </TableCell>
              <TableCell className="font-medium">
                {entitlement.minecraftUsername}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(entitlement.createdAt)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
