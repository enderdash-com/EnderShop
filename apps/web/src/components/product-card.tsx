import type { ShopProduct } from "@/lib/shop/types"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"

interface ProductCardProps {
  busy: boolean
  disabled?: boolean
  onCheckout: (productId: string) => void
  product: ShopProduct
}

export function ProductCard({
  busy,
  disabled = false,
  onCheckout,
  product,
}: ProductCardProps) {
  return (
    <Card className="border border-border/80 bg-card/95">
      <CardHeader className="border-b border-border/70">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Badge variant="secondary">
              {product.kind === "one_time_rank" ? "One-time" : "Subscription"}
            </Badge>
            <CardTitle>{product.name}</CardTitle>
            <CardDescription>{product.summary}</CardDescription>
          </div>
          <div className="shrink-0 text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase">
            {product.priceLabel}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
          {product.highlights.map((highlight) => (
            <li
              key={highlight}
              className="flex items-start gap-3 border-b border-border/40 pb-3 last:border-b-0 last:pb-0"
            >
              <span className="mt-1 size-2 shrink-0 bg-foreground/70" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="border-t border-border/70">
        <Button
          className="w-full"
          disabled={disabled || busy}
          onClick={() => onCheckout(product.id)}
        >
          {busy
            ? "Preparing checkout…"
            : product.kind === "one_time_rank"
              ? "Buy rank"
              : "Start subscription"}
        </Button>
      </CardFooter>
    </Card>
  )
}
