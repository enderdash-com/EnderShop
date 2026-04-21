import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { Check, Crown, Gem, Lock, Shield, Sparkles } from "lucide-react"
import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Field } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import type { LucideIcon } from "lucide-react"
import type { FormEvent } from "react"
import type { RankTier, ShopProduct } from "@/lib/shop/types"
import { PurchaseHistory } from "@/components/purchase-history"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { authClient } from "@/lib/auth-client"
import { shopCatalog } from "@/lib/shop/catalog"
import {
  getShopState,
  openBillingPortal,
  saveProfile,
  startCheckout,
} from "@/lib/server/shop-functions"

export const Route = createFileRoute("/")({ component: App })

const TIERS: Array<{ tier: RankTier; label: string; icon: LucideIcon }> = [
  { tier: "prime", label: "Prime", icon: Gem },
  { tier: "elite", label: "Elite", icon: Shield },
  { tier: "apex", label: "Apex", icon: Crown },
]

function shortUuid(uuid: string | null | undefined) {
  if (!uuid) return null
  return `${uuid.slice(0, 8)}…${uuid.slice(-4)}`
}

function App() {
  const session = authClient.useSession()
  const user = session.data?.user as
    | { isAnonymous?: boolean | null }
    | undefined
  const isAnonymous = Boolean(user?.isAnonymous)

  const queryClient = useQueryClient()
  const guestBootstrapRef = useRef(false)

  const ensureAnonymousSession = useEffectEvent(async () => {
    if (guestBootstrapRef.current) return
    guestBootstrapRef.current = true

    const result = await authClient.signIn.anonymous()
    if (result.error) {
      guestBootstrapRef.current = false
      toast.error(result.error.message || "Could not start a guest session.")
      return
    }

    await session.refetch()
  })

  useEffect(() => {
    if (session.isPending || session.data?.user) return
    void ensureAnonymousSession()
  }, [ensureAnonymousSession, session.data?.user, session.isPending])

  useEffect(() => {
    if (!session.data?.user) {
      startTransition(() => {
        queryClient.removeQueries({ queryKey: ["shop-state"] })
      })
    }
  }, [queryClient, session.data?.user])

  const shopStateQuery = useQuery({
    queryKey: ["shop-state", session.data?.user.id ?? null],
    queryFn: () => getShopState(),
    enabled: Boolean(session.data?.user),
    staleTime: 15_000,
  })

  const shopState = shopStateQuery.data ?? null

  const [profileDraft, setProfileDraft] = useState("")
  useEffect(() => {
    if (shopState?.profile.minecraftUsername) {
      setProfileDraft(shopState.profile.minecraftUsername)
    }
  }, [shopState?.profile.minecraftUsername])

  const saveProfileMutation = useMutation({
    mutationFn: (minecraftUsername: string) =>
      saveProfile({ data: { minecraftUsername } }),
    onSuccess: (profile) => {
      toast.success(
        profile.minecraftUsername
          ? `Linked to ${profile.minecraftUsername}`
          : "Profile saved."
      )
      void shopStateQuery.refetch()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Profile save failed."
      )
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: (productId: string) => startCheckout({ data: { productId } }),
    onSuccess: ({ url }) => {
      window.location.assign(url)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Checkout could not be started."
      )
    },
  })

  const portalMutation = useMutation({
    mutationFn: () => openBillingPortal({}),
    onSuccess: ({ url }) => {
      window.location.assign(url)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Billing portal could not be opened."
      )
    },
  })

  const usernameReady = Boolean(shopState?.profile.minecraftUuid)
  const currentTier = shopState?.rankState.currentTier ?? null
  const activeUltra = shopState?.rankState.activeUltra ?? null
  const eligibleIds = useMemo(
    () => new Set(shopState?.eligibleProductIds ?? []),
    [shopState?.eligibleProductIds]
  )

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = profileDraft.trim()
    if (!next) {
      toast.error("Enter a Minecraft username first.")
      return
    }
    saveProfileMutation.mutate(next)
  }

  function handleBuy(productId: string) {
    if (!usernameReady) {
      toast.error("Link your Minecraft username first.")
      return
    }
    checkoutMutation.mutate(productId)
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 pb-16">
        <section className="flex flex-col items-center gap-5 pt-14 text-center sm:pt-20">
          <span className="inline-flex items-center gap-2 border border-border bg-muted/60 px-3 py-1 text-[10px] font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            <span className="size-1.5 bg-foreground/60" />
            Official server shop
          </span>
          <h1 className="max-w-3xl font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Choose your rank. Stack a subscription.
          </h1>
          <p className="max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            Pick a lifetime tier, then layer on an Ultra subscription for
            monthly perks. Upgrades carry over your support history.
          </p>
        </section>

        {isAnonymous ? (
          <section className="flex flex-col items-center justify-between gap-3 border border-border bg-muted/30 px-5 py-4 sm:flex-row">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-3.5" />
              Create an account to keep your ranks across devices.
            </p>
            <div className="flex items-center gap-2">
              <Button
                render={<Link params={{ path: "sign-up" }} to="/auth/$path" />}
                size="sm"
              >
                Sign up
              </Button>
              <Button
                render={<Link params={{ path: "sign-in" }} to="/auth/$path" />}
                size="sm"
                variant="outline"
              >
                Sign in
              </Button>
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-3 border border-border bg-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold tracking-[0.3em] text-muted-foreground uppercase">
              {usernameReady ? "Delivering to" : "Link your player"}
            </span>
            <span className="font-heading text-base tracking-wide">
              {usernameReady
                ? shopState?.profile.minecraftUsername
                : "Enter your Minecraft username"}
            </span>
            {usernameReady ? (
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
                UUID {shortUuid(shopState?.profile.minecraftUuid)}
              </span>
            ) : null}
          </div>

          <form
            className="flex w-full items-center gap-2 sm:w-auto"
            onSubmit={handleProfileSave}
          >
            <Field className="w-full sm:w-60">
              <Input
                className="h-10 w-full min-w-0"
                id="minecraft-username"
                onChange={(event) => setProfileDraft(event.target.value)}
                placeholder="SteveAdmin"
                value={profileDraft}
              />
            </Field>
            <Button
              disabled={
                saveProfileMutation.isPending ||
                profileDraft.trim() ===
                  (shopState?.profile.minecraftUsername ?? "")
              }
              type="submit"
              variant={usernameReady ? "outline" : "default"}
            >
              {saveProfileMutation.isPending
                ? "Saving…"
                : usernameReady
                  ? "Update"
                  : "Link"}
            </Button>
          </form>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1 border-b border-border pb-3">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              Ranks
            </h2>
            <p className="text-sm text-muted-foreground">
              Lifetime rank, Ultra subscription, and one-click upgrades.
              Upgrading cancels any active Ultra.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TIERS.map(({ tier, label, icon }) => (
              <TierColumn
                activeUltra={activeUltra}
                busyProductId={
                  checkoutMutation.isPending
                    ? (checkoutMutation.variables ?? null)
                    : null
                }
                catalog={shopCatalog}
                currentTier={currentTier}
                eligibleIds={eligibleIds}
                icon={icon}
                key={tier}
                label={label}
                onBuy={handleBuy}
                onManage={() => portalMutation.mutate()}
                portalPending={portalMutation.isPending}
                tier={tier}
                usernameReady={usernameReady}
              />
            ))}
          </div>
          {!usernameReady ? (
            <p className="text-center text-xs tracking-wider text-muted-foreground uppercase">
              Link your Minecraft username above to enable checkout.
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
            <div className="flex flex-col gap-1">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                Your purchases
              </h2>
              <p className="text-sm text-muted-foreground">
                Stripe-confirmed orders and active subscriptions on this
                account.
              </p>
            </div>
            {shopState?.purchases.length ? (
              <Badge variant="secondary">
                {shopState.purchases.length} record
                {shopState.purchases.length === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
          <PurchaseHistory purchases={shopState?.purchases ?? []} />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

interface TierColumnProps {
  activeUltra: RankTier | null
  busyProductId: string | null
  catalog: Array<ShopProduct>
  currentTier: RankTier | null
  eligibleIds: Set<string>
  icon: LucideIcon
  label: string
  onBuy: (productId: string) => void
  onManage: () => void
  portalPending: boolean
  tier: RankTier
  usernameReady: boolean
}

const TIER_ORDER: Record<RankTier, number> = { prime: 1, elite: 2, apex: 3 }

function TierColumn({
  activeUltra,
  busyProductId,
  catalog,
  currentTier,
  eligibleIds,
  icon: Icon,
  label,
  onBuy,
  onManage,
  portalPending,
  tier,
  usernameReady,
}: TierColumnProps) {
  const base = catalog.find(
    (product) => product.kind === "base_rank" && product.tier === tier
  )
  const ultra = catalog.find(
    (product) => product.kind === "ultra_subscription" && product.tier === tier
  )
  const upgradesToHere = catalog.filter(
    (product) =>
      product.kind === "rank_upgrade" &&
      product.tier === tier &&
      eligibleIds.has(product.id)
  )

  const isCurrent = currentTier === tier
  const isBelowCurrent =
    currentTier && TIER_ORDER[currentTier] > TIER_ORDER[tier]
  const ultraIsActiveHere = activeUltra === tier

  return (
    <section
      className={cn(
        "flex flex-col border border-border bg-card",
        isCurrent && "ring-1 ring-foreground/30"
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center border border-border bg-muted/60">
            <Icon className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-[0.3em] text-muted-foreground uppercase">
              Tier
            </span>
            <h3 className="font-heading text-lg font-semibold tracking-wide">
              {label}
            </h3>
          </div>
        </div>
        {isCurrent ? (
          <Badge variant="secondary">Owned</Badge>
        ) : isBelowCurrent ? (
          <Badge variant="outline">Outgrown</Badge>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col gap-5 px-5 py-5">
        {base ? (
          <BaseCard
            busy={busyProductId === base.id}
            disabled={!usernameReady}
            eligible={eligibleIds.has(base.id)}
            isCurrent={isCurrent}
            isBelowCurrent={Boolean(isBelowCurrent)}
            onBuy={onBuy}
            product={base}
            upgrades={upgradesToHere}
            busyUpgradeId={busyProductId}
          />
        ) : null}

        {ultra ? (
          <UltraCard
            activeHere={ultraIsActiveHere}
            busy={busyProductId === ultra.id}
            disabled={!usernameReady}
            eligible={eligibleIds.has(ultra.id)}
            onBuy={onBuy}
            onManage={onManage}
            portalPending={portalPending}
            product={ultra}
            requiresTier={!isCurrent && !isBelowCurrent}
          />
        ) : null}
      </div>
    </section>
  )
}

interface BaseCardProps {
  busy: boolean
  busyUpgradeId: string | null
  disabled: boolean
  eligible: boolean
  isCurrent: boolean
  isBelowCurrent: boolean
  onBuy: (productId: string) => void
  product: ShopProduct
  upgrades: Array<ShopProduct>
}

function BaseCard({
  busy,
  busyUpgradeId,
  disabled,
  eligible,
  isCurrent,
  isBelowCurrent,
  onBuy,
  product,
  upgrades,
}: BaseCardProps) {
  return (
    <article className="flex flex-col gap-4 border border-border/70 bg-background/60 p-4">
      <div className="flex items-baseline gap-1.5">
        <span className="font-heading text-3xl font-semibold tabular-nums">
          {product.priceLabel}
        </span>
        <span className="text-xs tracking-wider text-muted-foreground uppercase">
          Lifetime
        </span>
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

      {isCurrent ? (
        <div className="flex items-center gap-2 border-t border-border/60 pt-3 text-xs tracking-wider text-muted-foreground uppercase">
          <Check className="size-3.5" />
          Currently active
        </div>
      ) : upgrades.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
          {upgrades.map((upgrade) => (
            <Button
              className="w-full"
              disabled={disabled || busyUpgradeId === upgrade.id}
              key={upgrade.id}
              onClick={() => onBuy(upgrade.id)}
              variant="default"
            >
              {busyUpgradeId === upgrade.id
                ? "Redirecting…"
                : `Upgrade for ${upgrade.priceLabel}`}
            </Button>
          ))}
        </div>
      ) : isBelowCurrent ? (
        <div className="flex items-center gap-2 border-t border-border/60 pt-3 text-xs tracking-wider text-muted-foreground uppercase">
          <Lock className="size-3.5" />
          Outgrown by your current tier
        </div>
      ) : (
        <Button
          className="w-full"
          disabled={disabled || busy || !eligible}
          onClick={() => onBuy(product.id)}
        >
          {busy ? "Redirecting…" : `Buy for ${product.priceLabel}`}
        </Button>
      )}
    </article>
  )
}

interface UltraCardProps {
  activeHere: boolean
  busy: boolean
  disabled: boolean
  eligible: boolean
  onBuy: (productId: string) => void
  onManage: () => void
  portalPending: boolean
  product: ShopProduct
  requiresTier: boolean
}

function UltraCard({
  activeHere,
  busy,
  disabled,
  eligible,
  onBuy,
  onManage,
  portalPending,
  product,
  requiresTier,
}: UltraCardProps) {
  return (
    <article className="flex flex-col gap-3 border border-border/70 bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            Ultra subscription
          </div>
          <h4 className="font-heading text-base tracking-wide">
            {product.name}
          </h4>
        </div>
        <div className="text-right">
          <div className="font-heading text-xl font-semibold tabular-nums">
            {product.priceLabel.split(" / ")[0]}
          </div>
          <div className="text-[10px] tracking-wider text-muted-foreground uppercase">
            / month
          </div>
        </div>
      </div>

      {activeHere ? (
        <Button
          className="w-full"
          disabled={portalPending}
          onClick={onManage}
          variant="outline"
        >
          {portalPending ? "Opening…" : "Manage subscription"}
        </Button>
      ) : requiresTier ? (
        <div className="flex items-center gap-2 text-xs tracking-wider text-muted-foreground uppercase">
          <Lock className="size-3.5" />
          Requires the {product.name.split(" ")[0]} rank
        </div>
      ) : !eligible ? (
        <div className="flex items-center gap-2 text-xs tracking-wider text-muted-foreground uppercase">
          <Lock className="size-3.5" />
          Unavailable with current state
        </div>
      ) : (
        <Button
          className="w-full"
          disabled={disabled || busy}
          onClick={() => onBuy(product.id)}
        >
          {busy ? "Redirecting…" : "Subscribe"}
        </Button>
      )}
    </article>
  )
}
