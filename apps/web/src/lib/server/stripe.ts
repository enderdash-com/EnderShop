import { DateTime, Effect, Exit, Result, Schema } from "effect"
import type Stripe from "stripe"

import {
  fulfillProductPurchase,
  revokeUltraGroup,
} from "@/lib/server/fulfillment"
import {
  isSubscriptionProduct,
  resolveProductConfig,
} from "@/lib/server/product-config"
import { ULTRA_TIER_GROUPS } from "@/lib/server/shop-state"
import {
  forgetStripeEvent,
  getCustomerProfile,
  recordStripeEvent,
  setStripeCustomerId,
} from "@/lib/server/store"
import { getShopProduct } from "@/lib/shop/catalog"
import type { PurchaseRecord, ShopProduct } from "@/lib/shop/types"

import { ShopInputError } from "./shop-services"
import { StripeGateway } from "./stripe-gateway"

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

function getMetadataTier(metadata: Stripe.Metadata) {
  const value = getMetadataString(metadata, "tier")
  return value === "prime" || value === "elite" || value === "apex"
    ? value
    : null
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

export const createCheckoutSession = Effect.fn("Shop.createCheckoutSession")(
  function* (input: {
    product: ShopProduct
    request: Request
    uuid: string
    username: string
    user: { email?: string | null; id: string }
  }) {
    const stripe = yield* StripeGateway
    const config = yield* resolveProductConfig(input.product.id)
    const profile = yield* getCustomerProfile(input.user.id)
    const origin = getOrigin(input.request)
    const metadata = buildCheckoutMetadata({
      product: input.product,
      userId: input.user.id,
      uuid: input.uuid,
      username: input.username,
    })

    const session = yield* stripe.checkout({
      allow_promotion_codes: true,
      cancel_url: `${origin}/checkout/cancel`,
      client_reference_id: input.user.id,
      ...(profile.stripeCustomerId === null
        ? {}
        : { customer: profile.stripeCustomerId }),
      ...(profile.stripeCustomerId ? {} : { customer_creation: "always" }),
      ...(profile.stripeCustomerId || !input.user.email
        ? {}
        : { customer_email: input.user.email }),
      line_items: [
        {
          price: config.priceId,
          quantity: 1,
        },
      ],
      metadata,
      mode: isSubscriptionProduct(input.product) ? "subscription" : "payment",
      ...(isSubscriptionProduct(input.product)
        ? { subscription_data: { metadata } }
        : {}),
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    })

    if (!session.url) {
      return yield* ShopInputError.make({
        message: "Stripe did not return a checkout URL.",
      })
    }

    return { url: session.url }
  }
)

export const createBillingPortalSession = Effect.fn(
  "Shop.createBillingPortalSession"
)(function* (input: { request: Request; userId: string }) {
  const profile = yield* getCustomerProfile(input.userId)
  if (!profile.stripeCustomerId) {
    return yield* ShopInputError.make({
      message: "No billing account is linked to your account yet.",
    })
  }

  const stripe = yield* StripeGateway
  const session = yield* stripe.portal({
    customer: profile.stripeCustomerId,
    return_url: `${getOrigin(input.request)}/`,
  })

  return { url: session.url }
}, Effect.uninterruptible)

const cancelActiveUltraSubscriptions = Effect.fn(
  "Shop.cancelActiveUltraSubscriptions"
)(function* (input: {
  stripeCustomerId: string
  except?: string | null
  target: { uuid: string; username: string }
}) {
  const stripe = yield* StripeGateway
  const data = yield* stripe.subscriptions({
    customer: input.stripeCustomerId,
    status: "active",
    limit: 100,
  })

  for (const subscription of data) {
    if (input.except && subscription.id === input.except) continue
    const productKind = getMetadataString(subscription.metadata, "productKind")
    if (productKind !== "ultra_subscription") continue

    const tier = getMetadataTier(subscription.metadata)

    yield* stripe.cancel(subscription.id)

    if (tier) {
      yield* revokeUltraGroup({ target: input.target, tier }).pipe(
        Effect.mapError((cause) =>
          SubscriptionRevocationError.make({
            subscriptionId: subscription.id,
            group: ULTRA_TIER_GROUPS[tier],
            cause,
          })
        )
      )
    }
  }
})

const applyCheckoutSession = Effect.fn("Shop.applyCheckoutSession")(function* (
  session: Stripe.Checkout.Session
) {
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
    yield* setStripeCustomerId({
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
    yield* cancelActiveUltraSubscriptions({
      stripeCustomerId,
      target: { uuid, username },
    })
  }

  yield* fulfillProductPurchase({
    productId: product.id,
    target: { uuid, username },
  })
})

const applySubscriptionState = Effect.fn("Shop.applySubscriptionState")(
  function* (subscription: Stripe.Subscription) {
    const productKind = getMetadataString(subscription.metadata, "productKind")
    if (productKind !== "ultra_subscription") return

    const tier = getMetadataTier(subscription.metadata)
    const uuid = getMetadataString(subscription.metadata, "minecraftUuid")
    const username = getMetadataString(
      subscription.metadata,
      "minecraftUsername"
    )

    if (!tier || !uuid || !username) return

    const status = subscription.status
    const shouldRevoke =
      status === "canceled" ||
      status === "incomplete_expired" ||
      status === "past_due" ||
      status === "unpaid"

    if (shouldRevoke) {
      yield* revokeUltraGroup({ target: { uuid, username }, tier })
    }
  }
)

export class SubscriptionRevocationError extends Schema.TaggedError<
  SubscriptionRevocationError,
  { readonly brand: unique symbol }
>()("SubscriptionRevocationError", {
  subscriptionId: Schema.String,
  group: Schema.String,
  cause: Schema.Unknown,
}) {
  override get message() {
    return `Cancelled Stripe subscription ${this.subscriptionId} but failed to remove ultra group ${this.group}.`
  }
}

export class WebhookProcessingError extends Schema.TaggedError<
  WebhookProcessingError,
  { readonly brand: unique symbol }
>()("WebhookProcessingError", {
  eventId: Schema.String,
  cause: Schema.Cause(Schema.Unknown, Schema.Unknown),
  releaseFailure: Schema.optionalKey(Schema.Unknown),
}) {
  override get message() {
    return "Webhook processing failed."
  }
}

export const processStripeEvent = Effect.fn("Shop.processStripeEvent")(
  function* (event: Stripe.Event) {
    const shouldProcess = yield* recordStripeEvent({
      id: event.id,
      type: event.type,
    })
    if (!shouldProcess) return { received: true, replay: true } as const

    const outcome = yield* Effect.exit(
      Effect.gen(function* () {
        // oxlint-disable-next-line typescript/switch-exhaustiveness-check -- Stripe.Event has hundreds of types and this webhook handles only these.
        switch (event.type) {
          case "checkout.session.completed": {
            yield* applyCheckoutSession(event.data.object)
            break
          }
          case "customer.subscription.updated":
          case "customer.subscription.deleted": {
            yield* applySubscriptionState(event.data.object)
            break
          }
        }
      })
    )
    if (Exit.isFailure(outcome)) {
      const released = yield* Effect.result(forgetStripeEvent(event.id))
      return yield* WebhookProcessingError.make({
        eventId: event.id,
        cause: outcome.cause,
        ...(Result.isFailure(released)
          ? { releaseFailure: released.failure }
          : {}),
      })
    }
    return { received: true } as const
    // Once an event has been claimed, finish its submitted mutations and recovery
    // before interruption returns. Successful events keep the replay marker.
  },
  Effect.uninterruptible
)

export const handleStripeWebhook = Effect.fn("Shop.handleStripeWebhook")(
  function* (request: Request) {
    const stripe = yield* StripeGateway
    const payload = yield* Effect.tryPromise({
      try: () => request.text(),
      catch: () =>
        ShopInputError.make({ message: "Could not read webhook payload." }),
    })
    const verified = yield* stripe
      .verify(payload, request.headers.get("stripe-signature") ?? "")
      .pipe(Effect.result)
    if (Result.isFailure(verified)) {
      if (verified.failure._tag !== "WebhookSignatureError")
        return yield* verified.failure
      return Response.json({ error: verified.failure.message }, { status: 400 })
    }
    return yield* processStripeEvent(verified.success).pipe(
      Effect.map((body) => Response.json(body)),
      Effect.catchTag("WebhookProcessingError", (error) =>
        Effect.logError(
          `[stripe] Failed to process event ${error.eventId}:`,
          error
        ).pipe(
          Effect.as(Response.json({ error: error.message }, { status: 500 }))
        )
      )
    )
  }
)

function formatAmount(amount: number | null, currency: string | null) {
  if (amount == null || !currency) return "N/A"
  const formatter = new Intl.NumberFormat("en", {
    currency: currency.toUpperCase(),
    style: "currency",
  })
  return formatter.format(amount / 100)
}

export const listCustomerPurchases = Effect.fn("Shop.listCustomerPurchases")(
  function* (stripeCustomerId: string) {
    const stripe = yield* StripeGateway
    const [sessions, subscriptions] = yield* Effect.all(
      [
        stripe.sessions({
          customer: stripeCustomerId,
          limit: 25,
        }),
        stripe.subscriptions({
          customer: stripeCustomerId,
          status: "all",
          limit: 25,
        }),
      ],
      { concurrency: 2 }
    )

    const records: Array<PurchaseRecord> = []

    for (const session of sessions) {
      if (session.payment_status !== "paid" && session.status !== "complete")
        continue
      const productId = getMetadataString(session.metadata, "productId")
      if (!productId) continue
      const product = getShopProduct(productId)
      if (!product) continue
      const createdAt = DateTime.formatIso(
        DateTime.makeUnsafe(session.created * 1000)
      )
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
            : (session.status ?? "unknown"),
        createdAt,
        minecraftUuid: getMetadataString(session.metadata, "minecraftUuid"),
      })
    }

    for (const subscription of subscriptions) {
      const productId = getMetadataString(subscription.metadata, "productId")
      if (!productId) continue
      const product = getShopProduct(productId)
      if (!product) continue
      const createdAt = DateTime.formatIso(
        DateTime.makeUnsafe(subscription.created * 1000)
      )
      const item = subscription.items.data.at(0)
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
        minecraftUuid: getMetadataString(
          subscription.metadata,
          "minecraftUuid"
        ),
      })
    }

    records.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return records
  }
)
