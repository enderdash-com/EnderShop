import assert from "node:assert/strict"
import { test } from "node:test"
import { Effect, Exit, Layer } from "effect"
import Stripe from "stripe"
import { makeStripeGateway } from "./stripe-gateway"
import { ShopSettings } from "./shop-services"

const settings = Layer.succeed(ShopSettings, {
  require: () => Effect.succeed("sk_test"),
})

test("every Stripe operation retains the pinned API version with SDK 23", async () => {
  const calls: Array<{ method: string | undefined; path: string }> = []
  const gateway = makeStripeGateway(async (url, init) => {
    assert.equal(
      new Headers(init?.headers).get("stripe-version"),
      "2026-03-25.dahlia"
    )
    const path = new URL(String(url)).pathname
    calls.push({ method: init?.method, path })
    return Response.json({
      id: "test",
      url: "https://checkout.example",
      data: [],
    })
  })
  const run = <TValue>(program: Effect.Effect<TValue, unknown, ShopSettings>) =>
    Effect.runPromise(program.pipe(Effect.provide(settings)))
  await run(gateway.checkout({ mode: "payment" }))
  await run(gateway.portal({ customer: "cus_test" }))
  await run(gateway.subscriptions({ customer: "cus_test" }))
  await run(gateway.cancel("sub_test"))
  await run(gateway.sessions({ customer: "cus_test" }))
  assert.deepEqual(calls, [
    { method: "POST", path: "/v1/checkout/sessions" },
    { method: "POST", path: "/v1/billing_portal/sessions" },
    { method: "GET", path: "/v1/subscriptions" },
    { method: "DELETE", path: "/v1/subscriptions/sub_test" },
    { method: "GET", path: "/v1/checkout/sessions" },
  ])
})

test("Stripe verifies signed events and rejects tampering and stale signatures", async () => {
  const secret = "whsec_dependency_validation"
  const layer = Layer.succeed(ShopSettings, {
    require: (name) =>
      Effect.succeed(name === "STRIPE_WEBHOOK_SECRET" ? secret : "sk_test"),
  })
  const gateway = makeStripeGateway()
  const event = {
    id: "evt_test",
    type: "checkout.session.completed",
    api_version: "2026-03-25.dahlia",
    data: { object: { id: "cs_test" } },
  }
  const payload = JSON.stringify(event)
  const signature = await Stripe.webhooks.generateTestHeaderStringAsync({
    payload,
    secret,
  })
  const verify = (body: string, header: string) =>
    Effect.runPromise(gateway.verify(body, header).pipe(Effect.provide(layer)))
  assert.deepEqual(await verify(payload, signature), event)
  await assert.rejects(
    verify(payload.replace("cs_test", "cs_tampered"), signature),
    { _tag: "WebhookSignatureError" }
  )
  const stale = await Stripe.webhooks.generateTestHeaderStringAsync({
    payload,
    secret,
    timestamp: Math.floor(Date.now() / 1000) - 600,
  })
  await assert.rejects(verify(payload, stale), {
    _tag: "WebhookSignatureError",
  })
})

test("Stripe does not replay a mutation after a truncated response", async () => {
  let calls = 0
  const gateway = makeStripeGateway(async () => {
    calls++
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"id":'))
          controller.error(new Error("synthetic lost acknowledgement"))
        },
      }),
      { headers: { "content-type": "application/json" } }
    )
  })
  await assert.rejects(
    Effect.runPromise(
      gateway.checkout({ mode: "payment" }).pipe(Effect.provide(settings))
    ),
    { _tag: "StripeOperationError", operation: "create-checkout" }
  )
  assert.equal(calls, 1)
})

test("Stripe does not retry a rejected mutation even when the server recommends retry", async () => {
  let calls = 0
  const gateway = makeStripeGateway(async (_url, init) => {
    calls++
    assert.equal(init?.method, "POST")
    return Response.json(
      { error: { message: "temporarily unavailable", type: "api_error" } },
      { status: 500, headers: { "stripe-should-retry": "true" } }
    )
  })
  await assert.rejects(
    Effect.runPromise(
      gateway.checkout({ mode: "payment" }).pipe(Effect.provide(settings))
    ),
    {
      _tag: "StripeOperationError",
      operation: "create-checkout",
      message: "Stripe could not complete the request. Try again shortly.",
    }
  )
  assert.equal(calls, 1)
})

test("submitted Stripe mutations settle before cancellation returns", async () => {
  let start!: () => void
  let finish!: () => void
  const started = new Promise<void>((resolve) => {
    start = resolve
  })
  const pending = new Promise<Response>((resolve) => {
    finish = () =>
      resolve(Response.json({ id: "cs_test", url: "https://checkout.example" }))
  })
  let calls = 0
  const gateway = makeStripeGateway(async () => {
    calls++
    start()
    return pending
  })
  const controller = new AbortController()
  let settled = false
  const result = Effect.runPromiseExit(
    gateway.checkout({ mode: "payment" }).pipe(Effect.provide(settings)),
    { signal: controller.signal }
  ).then((exit) => {
    settled = true
    return exit
  })
  await started
  controller.abort()
  await Promise.resolve()
  assert.equal(settled, false)
  finish()
  assert.equal(Exit.isFailure(await result), true)
  assert.equal(calls, 1)
})
