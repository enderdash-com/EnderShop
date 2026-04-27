import Stripe from "stripe"
import type {
  PurchaseRecord,
  RankTier,
  ShopProduct,
} from "@/lib/shop/types"
import { getShopProduct } from "@/lib/shop/catalog"
import { fulfillProductPurchase, revokeUltraGroup } from "@/lib/server/fulfillment"
import {
  isSubscriptionProduct,
  resolveProductConfig,
} from "@/lib/server/product-config"
import {
  forgetStripeEvent,
  getCustomerProfile,
  recordStripeEvent,
  setStripeCustomerId,
} from "@/lib/server/store"
import { ULTRA_TIER_GROUPS } from "@/lib/server/shop-state"
import { requireStringEnv } from "@/lib/server/worker-env"

function requireEnv(name: string) {
  return requireStringEnv(name as never)
}

export function getStripe() {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  })
}

function getOrigin(request: Request) {
  return new URL(request.url).origin
}

function getMetadataString(
  metadata:
    | Record<string, string | null | undefined>
    | Stripe.Metadata
    | null
    | undefined,
  key: string
) {
  const value = metadata?.[key]
  return typeof value === "string" && value.length > 0 ? value : null
}

function buildCheckoutMetadata(input: {
  product: ShopProduct
  userId: string
  uuid: string
  username: string
}): Record<string, string> {
  return {
    minecraftUsername: input.username,
    minecraftUuid: input.uuid,
    productId: input.product.id,
    productKind: input.product.kind,
    tier: input.product.tier,
    userId: input.userId,
  }
}

export async function createCheckoutSession(input: {
  product: ShopProduct
  request: Request
  uuid: string
  username: string
  user: { email?: string | null; id: string }
}) {
  const stripe = getStripe()
  const config = resolveProductConfig(input.product.id)
  const profile = await getCustomerProfile(input.user.id)
  const origin = getOrigin(input.request)
  const metadata = buildCheckoutMetadata({
    product: input.product,
    userId: input.user.id,
    uuid: input.uuid,
    username: input.username,
  })

  const session = await stripe.checkout.sessions.create({
    allow_promotion_codes: true,
    cancel_url: `${origin}/checkout/cancel`,
    client_reference_id: input.user.id,
    customer: profile.stripeCustomerId ?? undefined,
    customer_creation: profile.stripeCustomerId ? undefined : "always",
    customer_email:
      profile.stripeCustomerId || !input.user.email
        ? undefined
        : input.user.email,
    line_items: [
      {
        price: config.priceId,
        quantity: 1,
      },
    ],
    metadata,
    mode: isSubscriptionProduct(input.product) ? "subscription" : "payment",
    subscription_data: isSubscriptionProduct(input.product)
      ? { metadata }
      : undefined,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  })

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.")
  }

  return { url: session.url }
}

export async function createBillingPortalSession(input: {
  request: Request
  userId: string
}) {
  const profile = await getCustomerProfile(input.userId)
  if (!profile.stripeCustomerId) {
    throw new Error("No billing account is linked to your account yet.")
  }

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${getOrigin(input.request)}/`,
  })

  return { url: session.url }
}

async function cancelActiveUltraSubscriptions(input: {
  stripeCustomerId: string
  except?: string | null
  target: { uuid: string; username: string }
}) {
  const stripe = getStripe()
  const { data } = await stripe.subscriptions.list({
    customer: input.stripeCustomerId,
    status: "active",
    limit: 100,
  })

  for (const subscription of data) {
    if (input.except && subscription.id === input.except) continue
    const productKind = getMetadataString(subscription.metadata, "productKind")
    if (productKind !== "ultra_subscription") continue

    const tier = getMetadataString(subscription.metadata, "tier") as
      | RankTier
      | null

    await stripe.subscriptions.cancel(subscription.id, {
      invoice_now: false,
      prorate: false,
    })

    if (tier) {
      try {
        await revokeUltraGroup({ target: input.target, tier })
      } catch (error) {
        throw new Error(
          `Cancelled Stripe subscription ${subscription.id} but failed to remove ultra group ${ULTRA_TIER_GROUPS[tier]} for ${input.target.uuid}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }
}

async function applyCheckoutSession(session: Stripe.Checkout.Session) {
  const productId = getMetadataString(session.metadata, "productId")
  const userId = getMetadataString(session.metadata, "userId")
  const uuid = getMetadataString(session.metadata, "minecraftUuid")
  const username = getMetadataString(session.metadata, "minecraftUsername")

  if (!productId || !userId || !uuid || !username) {
    return
  }

  const product = getShopProduct(productId)
  if (!product) return

  if (typeof session.customer === "string") {
    await setStripeCustomerId({
      stripeCustomerId: session.customer,
      userId,
    })
  }

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : null

  if (
    (product.kind === "base_rank" || product.kind === "rank_upgrade") &&
    stripeCustomerId
  ) {
    await cancelActiveUltraSubscriptions({
      stripeCustomerId,
      target: { uuid, username },
    })
  }

  await fulfillProductPurchase({
    productId: product.id,
    target: { uuid, username },
  })
}

async function applySubscriptionState(subscription: Stripe.Subscription) {
  const productKind = getMetadataString(subscription.metadata, "productKind")
  if (productKind !== "ultra_subscription") return

  const tier = getMetadataString(subscription.metadata, "tier") as
    | RankTier
    | null
  const uuid = getMetadataString(subscription.metadata, "minecraftUuid")
  const username = getMetadataString(subscription.metadata, "minecraftUsername")

  if (!tier || !uuid || !username) return

  const status = subscription.status
  const shouldRevoke =
    status === "canceled" ||
    status === "incomplete_expired" ||
    status === "past_due" ||
    status === "unpaid"

  if (shouldRevoke) {
    await revokeUltraGroup({ target: { uuid, username }, tier })
  }
}

export async function handleStripeWebhook(request: Request) {
  const stripe = getStripe()
  const signature = request.headers.get("stripe-signature")
  const payload = await request.text()
  const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET")

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature ?? "",
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    )
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid webhook signature",
      },
      { status: 400 }
    )
  }

  const shouldProcess = await recordStripeEvent({
    id: event.id,
    type: event.type,
  })

  if (!shouldProcess) {
    return Response.json({ received: true, replay: true })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await applyCheckoutSession(event.data.object)
        break
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscriptionState(event.data.object)
        break
      default:
        break
    }
  } catch (error) {
    await forgetStripeEvent(event.id)
    console.error(`[stripe] Failed to process event ${event.id}:`, error)
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      { status: 500 }
    )
  }

  return Response.json({ received: true })
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount == null || !currency) return "N/A"
  const formatter = new Intl.NumberFormat("en", {
    currency: currency.toUpperCase(),
    style: "currency",
  })
  return formatter.format(amount / 100)
}

export async function listCustomerPurchases(
  stripeCustomerId: string
): Promise<Array<PurchaseRecord>> {
  const stripe = getStripe()
  const [sessions, subscriptions] = await Promise.all([
    stripe.checkout.sessions.list({
      customer: stripeCustomerId,
      limit: 25,
    }),
    stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 25,
    }),
  ])

  const records: Array<PurchaseRecord> = []

  for (const session of sessions.data) {
    if (session.payment_status !== "paid" && session.status !== "complete") continue
    const productId = getMetadataString(session.metadata, "productId")
    if (!productId) continue
    const product = getShopProduct(productId)
    if (!product) continue
    const createdAt = new Date(session.created * 1000).toISOString()
    records.push({
      id: session.id,
      productId,
      productName: product.name,
      productKind: product.kind,
      amountLabel: formatAmount(session.amount_total, session.currency),
      status:
        session.status === "complete"
          ? session.payment_status === "paid"
            ? "paid"
            : "complete"
          : session.status ?? "unknown",
      createdAt,
      minecraftUuid: getMetadataString(session.metadata, "minecraftUuid"),
    })
  }

  for (const subscription of subscriptions.data) {
    const productId = getMetadataString(subscription.metadata, "productId")
    if (!productId) continue
    const product = getShopProduct(productId)
    if (!product) continue
    const createdAt = new Date(subscription.created * 1000).toISOString()
    const item = subscription.items.data[0]
    const amount = item?.price.unit_amount ?? null
    const currency = item?.price.currency ?? null
    records.push({
      id: subscription.id,
      productId,
      productName: product.name,
      productKind: product.kind,
      amountLabel: `${formatAmount(amount, currency)} / mo`,
      status: subscription.status,
      createdAt,
      minecraftUuid: getMetadataString(subscription.metadata, "minecraftUuid"),
    })
  }

  records.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return records
}
