import Stripe from "stripe"
import { getShopProduct } from "@/lib/shop/catalog"
import type { RankEntitlement } from "@/lib/shop/types"
import { grantRankEntitlement, revokeRankEntitlement } from "@/lib/server/fulfillment"
import {
  countActiveEntitlements,
  findEntitlementBySubscriptionId,
  getCustomerProfile,
  recordStripeEvent,
  setStripeCustomerId,
  updateEntitlementFulfillment,
  upsertEntitlement,
} from "@/lib/server/store"
import { isSubscriptionKind, resolveProductConfig } from "@/lib/server/product-config"
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
  metadata: Record<string, string | null | undefined> | Stripe.Metadata | null | undefined,
  key: string
) {
  const value = metadata?.[key]
  return typeof value === "string" && value.length > 0 ? value : null
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const subscription = invoice.parent?.subscription_details?.subscription

  if (typeof subscription === "string") {
    return subscription
  }

  return subscription?.id ?? null
}

function getEntitlementErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export async function createCheckoutSession(input: {
  minecraftUsername: string
  productId: string
  request: Request
  user: { email?: string | null; id: string }
}) {
  const stripe = getStripe()
  const product = resolveProductConfig(input.productId)
  const existingActiveCount = await countActiveEntitlements({
    productId: input.productId,
    userId: input.user.id,
  })

  if (existingActiveCount > 0) {
    throw new Error("This rank is already active for your account.")
  }

  const profile = await getCustomerProfile(input.user.id)
  const successUrl = `${getOrigin(input.request)}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${getOrigin(input.request)}/checkout/cancel`
  const metadata = {
    minecraftUsername: input.minecraftUsername,
    productId: input.productId,
    userId: input.user.id,
  }

  const session = await stripe.checkout.sessions.create({
    allow_promotion_codes: true,
    cancel_url: cancelUrl,
    client_reference_id: input.user.id,
    customer: profile.stripeCustomerId ?? undefined,
    customer_creation: profile.stripeCustomerId
      ? undefined
      : product.product.kind === "one_time_rank"
        ? "always"
        : undefined,
    customer_email:
      profile.stripeCustomerId || !input.user.email
        ? undefined
        : input.user.email,
    line_items: [
      {
        price: product.priceId,
        quantity: 1,
      },
    ],
    metadata,
    mode: isSubscriptionKind(product.product.kind) ? "subscription" : "payment",
    subscription_data: isSubscriptionKind(product.product.kind)
      ? { metadata }
      : undefined,
    success_url: successUrl,
  })

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.")
  }

  return {
    url: session.url,
  }
}

function normalizeSubscriptionStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
    case "trialing":
      return "active"
    case "past_due":
    case "unpaid":
      return "past_due"
    case "canceled":
    case "incomplete_expired":
      return "canceled"
    default:
      return "pending"
  }
}

async function fulfillActiveEntitlement(entitlement: RankEntitlement) {
  if (entitlement.fulfillmentStatus === "granted") {
    return
  }

  try {
    await grantRankEntitlement(entitlement)
  } catch (error) {
    await updateEntitlementFulfillment({
      commandError: getEntitlementErrorMessage(error),
      commandResult: "FAILED",
      entitlementId: entitlement.id,
      fulfillmentStatus: "error",
    })
  }
}

async function revokeInactiveEntitlement(entitlement: RankEntitlement) {
  if (entitlement.fulfillmentStatus === "revoked") {
    return
  }

  try {
    await revokeRankEntitlement(entitlement)
  } catch (error) {
    await updateEntitlementFulfillment({
      commandError: getEntitlementErrorMessage(error),
      commandResult: "FAILED",
      entitlementId: entitlement.id,
      fulfillmentStatus: "error",
    })
  }
}

async function applyCheckoutSession(session: Stripe.Checkout.Session) {
  const productId = getMetadataString(session.metadata, "productId")
  const userId = getMetadataString(session.metadata, "userId")
  const minecraftUsername = getMetadataString(session.metadata, "minecraftUsername")

  if (!productId || !userId || !minecraftUsername) {
    return
  }

  const product = getShopProduct(productId)
  if (!product) {
    return
  }

  if (typeof session.customer === "string") {
    await setStripeCustomerId({
      stripeCustomerId: session.customer,
      userId,
    })
  }

  const entitlement = await upsertEntitlement({
    fulfillmentStatus: product.kind === "one_time_rank" ? "pending" : "pending",
    minecraftUsername,
    productId,
    productKind: product.kind,
    status: "active",
    stripeCheckoutSessionId: session.id,
    stripeCustomerId:
      typeof session.customer === "string" ? session.customer : null,
    stripePaymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null,
    stripeSubscriptionId:
      typeof session.subscription === "string" ? session.subscription : null,
    userId,
  })

  if (!entitlement) {
    return
  }

  await fulfillActiveEntitlement(entitlement)
}

async function applyInvoicePaid(invoice: Stripe.Invoice) {
  const invoiceSubscriptionId = getInvoiceSubscriptionId(invoice)
  if (!invoiceSubscriptionId) {
    return
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(invoiceSubscriptionId)
  const metadata = subscription.metadata
  const productId = getMetadataString(metadata, "productId")
  const userId = getMetadataString(metadata, "userId")
  const minecraftUsername = getMetadataString(metadata, "minecraftUsername")

  if (!productId || !userId || !minecraftUsername) {
    return
  }

  const product = getShopProduct(productId)
  if (!product) {
    return
  }

  const entitlement = await upsertEntitlement({
    fulfillmentStatus: "pending",
    minecraftUsername,
    productId,
    productKind: product.kind,
    status: normalizeSubscriptionStatus(subscription.status),
    stripeCustomerId:
      typeof invoice.customer === "string" ? invoice.customer : null,
    stripeInvoiceId: invoice.id,
    stripeSubscriptionId: subscription.id,
    userId,
  })

  if (!entitlement) {
    return
  }

  if (normalizeSubscriptionStatus(subscription.status) === "active") {
    await fulfillActiveEntitlement(entitlement)
  }
}

async function applySubscriptionState(subscription: Stripe.Subscription) {
  const entitlement = await findEntitlementBySubscriptionId(subscription.id)
  if (!entitlement) {
    return
  }

  const nextStatus = normalizeSubscriptionStatus(subscription.status)

  const nextEntitlement = await upsertEntitlement({
    fulfillmentStatus: entitlement.fulfillmentStatus,
    minecraftUsername: entitlement.minecraftUsername,
    productId: entitlement.productId,
    productKind: entitlement.productKind,
    status: nextStatus,
    stripeCustomerId:
      typeof subscription.customer === "string" ? subscription.customer : null,
    stripeSubscriptionId: subscription.id,
    userId:
      getMetadataString(subscription.metadata, "userId") ?? entitlement.userId,
  })

  if (!nextEntitlement) {
    return
  }

  if (nextStatus === "active") {
    await fulfillActiveEntitlement(nextEntitlement)
    return
  }

  if (nextStatus === "past_due" || nextStatus === "canceled") {
    await revokeInactiveEntitlement(nextEntitlement)
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
        error: error instanceof Error ? error.message : "Invalid webhook signature",
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

  switch (event.type) {
    case "checkout.session.completed":
      await applyCheckoutSession(event.data.object as Stripe.Checkout.Session)
      break
    case "invoice.paid":
      await applyInvoicePaid(event.data.object as Stripe.Invoice)
      break
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const invoiceSubscriptionId = getInvoiceSubscriptionId(invoice)

      if (invoiceSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(
          invoiceSubscriptionId
        )
        await applySubscriptionState(subscription)
      }
      break
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscriptionState(event.data.object as Stripe.Subscription)
      break
    default:
      break
  }

  return Response.json({ received: true })
}

export async function createBillingPortalSession(input: {
  request: Request
  userId: string
}) {
  const profile = await getCustomerProfile(input.userId)
  if (!profile.stripeCustomerId) {
    throw new Error("No Stripe customer is linked to this account yet.")
  }

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${getOrigin(input.request)}/`,
  })

  return {
    url: session.url,
  }
}
