import {
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"
import type { FormEvent } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { PurchaseHistory } from "@/components/purchase-history"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { authClient } from "@/lib/auth-client"
import { shopCatalog } from "@/lib/shop/catalog"
import type { CustomerProfile, RankEntitlement } from "@/lib/shop/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

export const Route = createFileRoute("/")({ component: App })

interface ShopStateResponse {
  entitlements: Array<RankEntitlement>
  profile: CustomerProfile
}

async function readJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : null),
      ...init?.headers,
    },
  })

  const body = (await response.json()) as T & { error?: string }

  if (!response.ok) {
    throw new Error(body.error || "Request failed.")
  }

  return body
}

const FEATURED_PRODUCT_ID = "legend-lifetime"

type RankKind = "all" | "one_time_rank" | "subscription_rank"

function App() {
  const session = authClient.useSession()
  const user = session.data?.user as
    | { isAnonymous?: boolean | null }
    | undefined

  const [busyProductId, setBusyProductId] = useState<string | null>(null)
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [profileDraft, setProfileDraft] = useState("")
  const [shopState, setShopState] = useState<ShopStateResponse | null>(null)
  const [filter, setFilter] = useState<RankKind>("all")
  const guestBootstrapRef = useRef(false)

  const isAnonymous = Boolean(user?.isAnonymous)
  const savedUsername = shopState?.profile.minecraftUsername ?? null
  const usernameReady = Boolean(savedUsername)

  const refreshShopState = useEffectEvent(async () => {
    if (!session.data?.user) {
      setShopState(null)
      return
    }

    const state = await readJson<ShopStateResponse>("/api/shop/entitlements")
    setProfileDraft(state.profile.minecraftUsername ?? "")
    setShopState(state)
  })

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
    if (!session.data?.user) return
    void refreshShopState()
  }, [refreshShopState, session.data?.user.id])

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = profileDraft.trim()
    if (!next) {
      toast.error("Enter a Minecraft username first.")
      return
    }

    setIsProfileSaving(true)

    try {
      const profile = await readJson<CustomerProfile>("/api/shop/profile", {
        body: JSON.stringify({ minecraftUsername: next }),
        method: "PATCH",
      })

      setShopState((current) =>
        current
          ? { ...current, profile }
          : { entitlements: [], profile }
      )
      toast.success(`Linked to ${next}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile save failed.")
    } finally {
      setIsProfileSaving(false)
    }
  }

  async function handleCheckout(productId: string) {
    if (!usernameReady) {
      toast.error("Add your Minecraft username first.")
      document.getElementById("minecraft-username")?.focus()
      return
    }

    setBusyProductId(productId)

    try {
      const checkout = await readJson<{ url: string }>("/api/shop/checkout", {
        body: JSON.stringify({ productId }),
        method: "POST",
      })

      window.location.assign(checkout.url)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Checkout could not be started."
      )
      setBusyProductId(null)
    }
  }

  const visibleProducts = useMemo(
    () =>
      filter === "all"
        ? shopCatalog
        : shopCatalog.filter((product) => product.kind === filter),
    [filter]
  )

  useEffect(() => {
    if (!session.data?.user) {
      startTransition(() => {
        setShopState(null)
        setProfileDraft("")
      })
    }
  }, [session.data?.user])

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
            Unlock perks. Support the server.
          </h1>
          <p className="max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            Pick a rank, pay with your preferred method, and your in-game
            permissions are granted automatically within seconds.
          </p>
        </section>

        {isAnonymous ? (
          <section className="flex flex-col items-center justify-between gap-3 border border-border bg-muted/30 px-5 py-4 sm:flex-row">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-3.5" />
              Create an account to keep your purchases across devices.
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
              {usernameReady ? "Delivering to" : "Set your player"}
            </span>
            <span className="font-heading text-base tracking-wide">
              {usernameReady ? savedUsername : "Enter your Minecraft username"}
            </span>
          </div>

          <form
            className="flex w-full items-center gap-2 sm:w-auto"
            onSubmit={handleProfileSave}
          >
            <Input
              className="h-10 w-full min-w-0 sm:w-60"
              id="minecraft-username"
              onChange={(event) => setProfileDraft(event.target.value)}
              placeholder="SteveAdmin"
              value={profileDraft}
            />
            <Button
              disabled={isProfileSaving || profileDraft.trim() === (savedUsername ?? "")}
              type="submit"
              variant={usernameReady ? "outline" : "default"}
            >
              {isProfileSaving ? "Saving…" : usernameReady ? "Update" : "Save"}
            </Button>
          </form>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-3">
            <div className="flex flex-col gap-1">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                Ranks
              </h2>
              <p className="text-sm text-muted-foreground">
                Lifetime or monthly. Cancel subscriptions anytime.
              </p>
            </div>
            <div className="flex items-center gap-1 border border-border bg-card p-1 text-[10px] font-semibold tracking-[0.24em] uppercase">
              {[
                { key: "all" as const, label: "All" },
                { key: "one_time_rank" as const, label: "Lifetime" },
                { key: "subscription_rank" as const, label: "Monthly" },
              ].map((option) => (
                <button
                  aria-pressed={filter === option.key}
                  className={
                    filter === option.key
                      ? "bg-foreground px-3 py-1.5 text-background"
                      : "px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  }
                  key={option.key}
                  onClick={() => setFilter(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visibleProducts.map((product) => (
              <ProductCard
                busy={busyProductId === product.id}
                disabled={!usernameReady}
                featured={product.id === FEATURED_PRODUCT_ID}
                key={product.id}
                onCheckout={handleCheckout}
                product={product}
              />
            ))}
          </div>

          {!usernameReady ? (
            <p className="text-center text-xs tracking-wider text-muted-foreground uppercase">
              Set a Minecraft username above to enable checkout.
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
                Active ranks, subscriptions, and past orders on this account.
              </p>
            </div>
            {shopState?.entitlements.length ? (
              <Badge variant="secondary">
                {shopState.entitlements.length} record
                {shopState.entitlements.length === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
          <PurchaseHistory entitlements={shopState?.entitlements ?? []} />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
