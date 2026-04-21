import {
  type FormEvent,
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"
import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { AuthDialog } from "@/components/auth-dialog"
import { ProductCard } from "@/components/product-card"
import { PurchaseHistory } from "@/components/purchase-history"
import { SiteFooter } from "@/components/site-footer"
import { authClient } from "@/lib/auth-client"
import { shopCatalog } from "@/lib/shop/catalog"
import type { CustomerProfile, RankEntitlement } from "@/lib/shop/types"
import { Button } from "@workspace/ui/components/button"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

export const Route = createFileRoute("/")({ component: App })

interface ShopStateResponse {
  entitlements: RankEntitlement[]
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

function formatAccountLabel(input: {
  email: string | null | undefined
  isAnonymous: boolean | null | undefined
  name: string | null | undefined
}) {
  if (input.isAnonymous) {
    return input.name || "Guest session"
  }

  return input.name || input.email || "Account"
}

function App() {
  const session = authClient.useSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [busyProductId, setBusyProductId] = useState<string | null>(null)
  const [isPortalPending, setIsPortalPending] = useState(false)
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [profileDraft, setProfileDraft] = useState("")
  const [shopState, setShopState] = useState<ShopStateResponse | null>(null)
  const guestBootstrapRef = useRef(false)

  const accountLabel = useMemo(
    () =>
      formatAccountLabel({
        email: session.data?.user.email,
        isAnonymous: (session.data?.user as { isAnonymous?: boolean } | undefined)
          ?.isAnonymous,
        name: session.data?.user.name,
      }),
    [session.data?.user]
  )

  const profileWarning =
    shopState && !shopState.profile.minecraftUsername
      ? "Add a Minecraft username before starting checkout. Fulfillment commands need a player target."
      : null

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
    if (guestBootstrapRef.current) {
      return
    }

    guestBootstrapRef.current = true

    const result = await authClient.signIn.anonymous()
    if (result.error) {
      guestBootstrapRef.current = false
      toast.error(result.error.message || "Could not start a guest session.")
      return
    }

    toast.success("Guest session ready.")
    await session.refetch()
  })

  useEffect(() => {
    if (session.isPending || session.data?.user) {
      return
    }

    void ensureAnonymousSession()
  }, [ensureAnonymousSession, session.data?.user, session.isPending])

  useEffect(() => {
    if (!session.data?.user) {
      return
    }

    void refreshShopState()
  }, [refreshShopState, session.data?.user?.id])

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsProfileSaving(true)

    try {
      const profile = await readJson<CustomerProfile>("/api/shop/profile", {
        body: JSON.stringify({
          minecraftUsername: profileDraft,
        }),
        method: "PATCH",
      })

      setShopState((current) =>
        current
          ? {
              ...current,
              profile,
            }
          : {
              entitlements: [],
              profile,
            }
      )
      toast.success("Minecraft profile saved.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile save failed.")
    } finally {
      setIsProfileSaving(false)
    }
  }

  async function handleCheckout(productId: string) {
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

  async function handleOpenPortal() {
    setIsPortalPending(true)

    try {
      const portal = await readJson<{ url: string }>("/api/shop/portal", {
        method: "POST",
      })

      window.location.assign(portal.url)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Billing portal could not be opened."
      )
      setIsPortalPending(false)
    }
  }

  async function handleSignOut() {
    const result = await authClient.signOut()
    if (result.error) {
      toast.error(result.error.message || "Could not sign out.")
      return
    }

    toast.success("Signed out.")
    guestBootstrapRef.current = false
    startTransition(() => {
      setShopState(null)
      setProfileDraft("")
    })
    await session.refetch()
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="border-b border-border/70 bg-card/70">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center border border-foreground bg-foreground text-background text-sm font-semibold tracking-[0.28em] uppercase">
              ES
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-xl font-semibold tracking-[0.18em] uppercase">
                EnderShop
              </span>
              <span className="text-sm text-muted-foreground">
                Stripe checkout, anonymous accounts, and EnderDash fulfillment.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>{accountLabel.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 flex-col text-right sm:flex">
              <span className="truncate text-sm font-medium">{accountLabel}</span>
              <span className="truncate text-xs text-muted-foreground">
                {session.data?.user.email ||
                  ((session.data?.user as { isAnonymous?: boolean } | undefined)
                    ?.isAnonymous
                    ? "Anonymous checkout session"
                    : "Initializing session")}
              </span>
            </div>
            <Button
              onClick={() => setAuthOpen(true)}
              variant={
                (session.data?.user as { isAnonymous?: boolean } | undefined)
                  ?.isAnonymous
                  ? "default"
                  : "outline"
              }
            >
              {(session.data?.user as { isAnonymous?: boolean } | undefined)
                ?.isAnonymous
                ? "Create account"
                : "Switch account"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="flex min-w-0 flex-col gap-6">
          {profileWarning ? (
            <Alert>
              <AlertTitle>Profile incomplete</AlertTitle>
              <AlertDescription>{profileWarning}</AlertDescription>
            </Alert>
          ) : null}

          <Card className="border border-border/80">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Rank catalog</CardTitle>
              <CardDescription>
                Sell permanent and recurring ranks from one storefront, then
                hand fulfillment off to EnderDash.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <Tabs defaultValue="one-time">
                <TabsList variant="line">
                  <TabsTrigger value="one-time">One-time ranks</TabsTrigger>
                  <TabsTrigger value="subscriptions">
                    Rank subscriptions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="one-time">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {shopCatalog
                      .filter((product) => product.kind === "one_time_rank")
                      .map((product) => (
                        <ProductCard
                          key={product.id}
                          busy={busyProductId === product.id}
                          disabled={!shopState?.profile.minecraftUsername}
                          onCheckout={handleCheckout}
                          product={product}
                        />
                      ))}
                  </div>
                </TabsContent>

                <TabsContent value="subscriptions">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {shopCatalog
                      .filter(
                        (product) => product.kind === "subscription_rank"
                      )
                      .map((product) => (
                        <ProductCard
                          key={product.id}
                          busy={busyProductId === product.id}
                          disabled={!shopState?.profile.minecraftUsername}
                          onCheckout={handleCheckout}
                          product={product}
                        />
                      ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border border-border/80">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Purchase log</CardTitle>
              <CardDescription>
                Each completed Stripe event becomes an entitlement record, then
                fulfillment runs through the configured console commands.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PurchaseHistory entitlements={shopState?.entitlements ?? []} />
            </CardContent>
          </Card>
        </main>

        <aside className="flex min-w-0 flex-col gap-6">
          <Card className="border border-border/80">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Player target</CardTitle>
              <CardDescription>
                EnderDash fulfillment uses this Minecraft username when it
                renders console commands.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-6" onSubmit={handleProfileSave}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="minecraft-username">
                      Minecraft username
                    </FieldLabel>
                    <Input
                      id="minecraft-username"
                      onChange={(event) => setProfileDraft(event.target.value)}
                      placeholder="SteveAdmin"
                      value={profileDraft}
                    />
                    <FieldDescription>
                      Use the exact name your server and LuckPerms commands
                      expect.
                    </FieldDescription>
                  </Field>
                </FieldGroup>

                <Button disabled={isProfileSaving} type="submit">
                  {isProfileSaving ? "Saving…" : "Save player profile"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-border/80">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Account mode</CardTitle>
              <CardDescription>
                Start as a guest, then attach email credentials without losing
                cart or purchase state.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm">Current state</span>
                <Badge
                  variant={
                    (session.data?.user as { isAnonymous?: boolean } | undefined)
                      ?.isAnonymous
                      ? "secondary"
                      : "default"
                  }
                >
                  {(session.data?.user as { isAnonymous?: boolean } | undefined)
                    ?.isAnonymous
                    ? "Guest"
                    : "Full account"}
                </Badge>
              </div>
              <Separator />
              <div className="flex flex-col gap-3">
                <Button onClick={() => setAuthOpen(true)} variant="outline">
                  {(session.data?.user as { isAnonymous?: boolean } | undefined)
                    ?.isAnonymous
                    ? "Convert guest session"
                    : "Open auth panel"}
                </Button>
                <Button
                  disabled={isPortalPending}
                  onClick={handleOpenPortal}
                  variant="outline"
                >
                  {isPortalPending ? "Opening portal…" : "Open billing portal"}
                </Button>
                <Button onClick={handleSignOut} variant="ghost">
                  Sign out
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Fulfillment path</CardTitle>
              <CardDescription>
                EnderShop keeps the purchase record, Stripe owns billing, and
                EnderDash runs the grant or revoke commands.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
              <div className="border-b border-border/50 pb-4">
                1. Anonymous or full account session starts in Better Auth.
              </div>
              <div className="border-b border-border/50 pb-4">
                2. Stripe Checkout creates the payment or subscription.
              </div>
              <div className="border-b border-border/50 pb-4">
                3. Webhooks upsert entitlements and call EnderDash.
              </div>
              <div>4. Console commands grant or revoke the configured rank.</div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <AuthDialog
        anonymousMode={
          Boolean(
            (session.data?.user as { isAnonymous?: boolean } | undefined)
              ?.isAnonymous
          )
        }
        onAuthenticated={async () => {
          await session.refetch()
          await refreshShopState()
        }}
        onOpenChange={setAuthOpen}
        open={authOpen}
      />
      <SiteFooter />
    </div>
  )
}
