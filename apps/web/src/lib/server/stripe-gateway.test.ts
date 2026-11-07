import assert from "node:assert/strict"
import { test } from "node:test"
import { Effect, Exit, Layer } from "effect"
import { makeStripeGateway } from "./stripe-gateway"
import { ShopSettings } from "./shop-services"

const settings = Layer.succeed(ShopSettings, {
  require: () => Effect.succeed("sk_test"),
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
