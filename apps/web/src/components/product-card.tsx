import { Check, Crown, Gem, Shield, Sparkles } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import type { LucideIcon } from "lucide-react"
import type { ShopProduct } from "@/lib/shop/types"

interface ProductCardProps {
  busy: boolean
  disabled?: boolean
  featured?: boolean
  onCheckout: (productId: string) => void
  product: ShopProduct
}

const productIcons: Record<string, LucideIcon> = {
  "founder-lifetime": Gem,
  "legend-lifetime": Crown,
  "sentinel-monthly": Shield,
  "network-plus-monthly": Sparkles,
}

function parsePrice(label: string) {
  const amount = label.match(/([€$£]\s?\d+(?:[.,]\d+)?)/)?.[1] ?? label
  const cadence = label.replace(amount, "").trim().replace(/^[/\-·•]?\s*/, "")
  return { amount: amount.trim(), cadence }
}

export function ProductCard({
  busy,
  disabled = false,
  featured = false,
  onCheckout,
  product,
}: ProductCardProps) {
  const Icon = productIcons[product.id] ?? Gem
  const { amount, cadence } = parsePrice(product.priceLabel)
  const isSubscription = product.kind === "subscription_rank"

  return (
    <article
      className={cn(
        "group/product relative flex h-full flex-col border border-border bg-card transition-colors",
        "hover:border-foreground/40",
        featured && "ring-1 ring-foreground/20"
      )}
    >
      {featured ? (
        <div className="absolute inset-x-0 -top-px flex justify-center">
          <span className="-translate-y-1/2 border border-foreground bg-background px-3 py-0.5 text-[10px] font-semibold tracking-[0.3em] uppercase">
            Most popular
          </span>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center border border-border bg-muted/60 text-foreground">
            <Icon className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-[0.3em] text-muted-foreground uppercase">
              {isSubscription ? "Subscription" : "Lifetime"}
            </span>
            <h3 className="font-heading text-lg font-semibold tracking-wide">
              {product.name}
            </h3>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-3xl font-semibold tabular-nums">
            {amount}
          </span>
          {cadence ? (
            <span className="text-xs tracking-wider text-muted-foreground uppercase">
              {cadence}
            </span>
          ) : null}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {product.summary}
        </p>

        <ul className="flex flex-col gap-2 text-sm">
          {product.highlights.map((highlight) => (
            <li className="flex items-start gap-2.5" key={highlight}>
              <Check className="mt-0.5 size-3.5 shrink-0 text-foreground" />
              <span className="text-foreground/90">{highlight}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto border-t border-border px-5 py-4">
        <Button
          className="w-full"
          disabled={disabled || busy}
          onClick={() => onCheckout(product.id)}
          variant={featured ? "default" : "outline"}
        >
          {busy
            ? "Redirecting…"
            : isSubscription
              ? "Subscribe"
              : "Buy rank"}
        </Button>
      </div>
    </article>
  )
}
