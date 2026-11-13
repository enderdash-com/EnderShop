import Stripe from "stripe"
import { Context, Data, Effect } from "effect"
import { setting } from "./shop-services"
import type { ShopConfigurationError, ShopSettings } from "./shop-services"

export class StripeOperationError extends Data.TaggedError(
  "StripeOperationError"
)<{
  readonly operation: string
  readonly cause: unknown
}> {
  override get message() {
    return "Stripe could not complete the request. Try again shortly."
  }
}
export class WebhookSignatureError extends Data.TaggedError(
  "WebhookSignatureError"
)<{
  readonly cause: unknown
}> {
  override get message() {
    return this.cause instanceof Error
      ? this.cause.message
      : "Invalid webhook signature"
  }
}

export type StripeCheckoutRecord = Pick<
  Stripe.Checkout.Session,
  | "id"
  | "metadata"
  | "customer"
  | "status"
  | "payment_status"
  | "created"
  | "amount_total"
  | "currency"
>
export type StripeSubscriptionRecord = Pick<
  Stripe.Subscription,
  "id" | "metadata" | "status" | "created"
> & {
  readonly items: {
    readonly data: ReadonlyArray<{
      readonly price: Pick<Stripe.Price, "unit_amount" | "currency">
    }>
  }
}

type StripeFailure = StripeOperationError | ShopConfigurationError
export class StripeGateway extends Context.Service<
  StripeGateway,
  {
    readonly checkout: (
      params: Stripe.Checkout.SessionCreateParams
    ) => Effect.Effect<
      Pick<Stripe.Checkout.Session, "url">,
      StripeFailure,
      ShopSettings
    >
    readonly portal: (
      params: Stripe.BillingPortal.SessionCreateParams
    ) => Effect.Effect<
      Pick<Stripe.BillingPortal.Session, "url">,
      StripeFailure,
      ShopSettings
    >
    readonly subscriptions: (
      params: Stripe.SubscriptionListParams
    ) => Effect.Effect<
      ReadonlyArray<StripeSubscriptionRecord>,
      StripeFailure,
      ShopSettings
    >
    readonly cancel: (
      id: string
    ) => Effect.Effect<void, StripeFailure, ShopSettings>
    readonly sessions: (
      params: Stripe.Checkout.SessionListParams
    ) => Effect.Effect<
      ReadonlyArray<StripeCheckoutRecord>,
      StripeFailure,
      ShopSettings
    >
    readonly verify: (
      payload: string,
      signature: string
    ) => Effect.Effect<
      Stripe.Event,
      WebhookSignatureError | ShopConfigurationError,
      ShopSettings
    >
  }
>()("endershop/StripeGateway") {}

export function makeStripeGateway(
  fetcher?: Parameters<typeof Stripe.createFetchHttpClient>[0]
): Context.Service.Shape<typeof StripeGateway> {
  const client = Effect.gen(function* () {
    const secret = yield* setting("STRIPE_SECRET_KEY")
    return new Stripe(secret, {
      apiVersion: "2026-03-25.dahlia",
      httpClient: Stripe.createFetchHttpClient(fetcher),
      // A lost acknowledgement can follow a successful payment mutation. Recovery
      // belongs to the webhook workflow; the transport must not replay it.
      maxNetworkRetries: 0,
    })
  })

  const stripeOperation = <TValue>(
    operation: string,
    execute: (stripe: Stripe) => PromiseLike<TValue>
  ) =>
    Effect.gen(function* () {
      const stripe = yield* client
      // Stripe does not expose an AbortSignal here. Wait for the submitted request
      // before the enclosing program settles or starts recovery.
      return yield* Effect.tryPromise({
        try: async () => execute(stripe),
        catch: (cause) => new StripeOperationError({ operation, cause }),
      }).pipe(Effect.uninterruptible)
    })

  return {
    checkout: (params) =>
      stripeOperation("create-checkout", (stripe) =>
        stripe.checkout.sessions.create(params)
      ),
    portal: (params) =>
      stripeOperation("create-portal", (stripe) =>
        stripe.billingPortal.sessions.create(params)
      ),
    subscriptions: (params) =>
      stripeOperation("list-subscriptions", (stripe) =>
        stripe.subscriptions.list(params)
      ).pipe(Effect.map((page) => page.data)),
    cancel: (id) =>
      stripeOperation("cancel-subscription", (stripe) =>
        stripe.subscriptions.cancel(id, { invoice_now: false, prorate: false })
      ).pipe(Effect.asVoid),
    sessions: (params) =>
      stripeOperation("list-checkouts", (stripe) =>
        stripe.checkout.sessions.list(params)
      ).pipe(Effect.map((page) => page.data)),
    verify: (payload, signature) =>
      Effect.gen(function* () {
        const stripe = yield* client
        const secret = yield* setting("STRIPE_WEBHOOK_SECRET")
        return yield* Effect.tryPromise({
          try: () =>
            stripe.webhooks.constructEventAsync(
              payload,
              signature,
              secret,
              undefined,
              Stripe.createSubtleCryptoProvider()
            ),
          catch: (cause) => new WebhookSignatureError({ cause }),
        })
      }),
  }
}

export const stripeGateway = makeStripeGateway()
