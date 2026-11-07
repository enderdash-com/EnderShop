import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { eq } from "drizzle-orm"
import { Effect, Exit, Result } from "effect"
import { EnderdashError } from "./enderdash"
import { getCustomerProfile } from "./store"
import { stripeEvent as stripeEventTable } from "./schema"
import { handleStripeWebhook, processStripeEvent } from "./stripe"
import {
  ShopConfigurationError,
  ShopDatabase,
  ShopSettings,
  ShopStoreError,
} from "./shop-services"
import { StripeGateway, stripeGateway } from "./stripe-gateway"
import { checkoutEvent, shopFixture, stripeEvent } from "./shop-test-fixture"
import type { ShopServices } from "./shop-runtime"

let fixture: Awaited<ReturnType<typeof shopFixture>>
before(async () => {
  fixture = await shopFixture()
  await fixture.addUser("customer")
})
after(async () => fixture.worker.dispose())
const run = <A, E>(program: Effect.Effect<A, E, ShopServices>) =>
  Effect.runPromise(program.pipe(Effect.provide(fixture.layer())))
const marker = (id: string) =>
  fixture.db.select().from(stripeEventTable).where(eq(stripeEventTable.id, id))

function subscription(id = "sub_ultra") {
  return {
    id,
    metadata: {
      productKind: "ultra_subscription",
      tier: "prime",
      minecraftUuid: "player-uuid",
      minecraftUsername: "Player",
    },
    status: "active" as const,
    created: 100,
    items: { data: [] },
  }
}

test("checkout webhooks link the customer, cancel old subscriptions, revoke, then grant", async () => {
  const calls: string[] = []
  const oldExecute = fixture.enderdash.execute
  const oldList = fixture.stripe.subscriptions
  const oldCancel = fixture.stripe.cancel
  fixture.stripe.subscriptions = () =>
    Effect.promise(async () => {
      assert.equal(
        (await run(getCustomerProfile("customer"))).stripeCustomerId,
        "cus_test"
      )
      return [subscription()]
    })
  fixture.stripe.cancel = (id) =>
    Effect.sync(() => {
      calls.push(`cancel:${id}`)
    })
  fixture.enderdash.execute = (input) =>
    Effect.sync(() => {
      calls.push(input.command)
      return {
        ...input,
        requestId: "request",
        commandResult: 1,
        error: null,
        success: true,
      }
    })
  const event = await checkoutEvent()
  try {
    assert.deepEqual(await run(processStripeEvent(event)), { received: true })
    assert.deepEqual(calls, [
      "cancel:sub_ultra",
      "lp user player-uuid parent remove prime_ultra",
      "lp user player-uuid parent set elite",
    ])
    assert.deepEqual(await run(processStripeEvent(event)), {
      received: true,
      replay: true,
    })
    assert.equal(calls.length, 3)
    assert.equal((await marker(event.id)).length, 1)
  } finally {
    fixture.enderdash.execute = oldExecute
    fixture.stripe.subscriptions = oldList
    fixture.stripe.cancel = oldCancel
  }
})

test("failed fulfillment releases its marker so Stripe can replay the event", async () => {
  const original = fixture.enderdash.execute
  fixture.enderdash.execute = () =>
    Effect.fail(
      new EnderdashError({
        operation: "executeConsoleCommand",
        reason: "transport",
        uncertain: true,
        message: "lost acknowledgement",
      })
    )
  const event = await checkoutEvent()
  try {
    const failed = await run(Effect.result(processStripeEvent(event)))
    assert(Result.isFailure(failed))
    assert.equal(failed.failure._tag, "WebhookProcessingError")
    assert.equal((await marker(event.id)).length, 0)
    fixture.enderdash.execute = original
    assert.deepEqual(await run(processStripeEvent(event)), { received: true })
    assert.equal((await marker(event.id)).length, 1)
  } finally {
    fixture.enderdash.execute = original
  }
})

test("cancellation after event claim waits for submitted fulfillment and retains its marker", async () => {
  let start!: () => void
  let finish!: () => void
  const started = new Promise<void>((resolve) => {
    start = resolve
  })
  const pending = new Promise<void>((resolve) => {
    finish = resolve
  })
  const original = fixture.enderdash.execute
  let commands = 0
  fixture.enderdash.execute = (input) =>
    Effect.promise(async () => {
      commands++
      start()
      await pending
      return {
        ...input,
        requestId: "request",
        commandResult: 1,
        error: null,
        success: true,
      }
    })
  const event = await checkoutEvent()
  const controller = new AbortController()
  let settled = false
  const result = Effect.runPromiseExit(
    processStripeEvent(event).pipe(Effect.provide(fixture.layer())),
    { signal: controller.signal }
  ).then((exit) => {
    settled = true
    return exit
  })
  try {
    await started
    controller.abort()
    await Promise.resolve()
    assert.equal(settled, false)
    finish()
    assert.equal(Exit.isFailure(await result), true)
    assert.equal(commands, 1)
    assert.equal((await marker(event.id)).length, 1)
    assert.deepEqual(await run(processStripeEvent(event)), {
      received: true,
      replay: true,
    })
    assert.equal(commands, 1)
  } finally {
    finish()
    fixture.enderdash.execute = original
  }
})

test("signature failures return 400 without claiming an event", async () => {
  const previousMarkers = await fixture.db.select().from(stripeEventTable)
  const request = new Request("https://shop.example/api/stripe/webhook", {
    method: "POST",
    body: "{}",
    headers: { "stripe-signature": "invalid" },
  })
  const response = await run(
    handleStripeWebhook(request).pipe(
      Effect.provideService(StripeGateway, stripeGateway)
    )
  )
  assert.equal(response.status, 400)
  const body: unknown = await response.json()
  assert.equal(typeof body, "object")
  assert.deepEqual(
    await fixture.db.select().from(stripeEventTable),
    previousMarkers
  )
})

test("unrelated and incomplete events are acknowledged and deduplicated", async () => {
  for (const event of await Promise.all([
    stripeEvent("checkout.session.completed", { metadata: {} }),
    stripeEvent("customer.subscription.deleted", {
      ...subscription(),
      metadata: {
        productKind: "ultra_subscription",
        tier: "invalid",
        minecraftUuid: "uuid",
        minecraftUsername: "Player",
      },
    }),
    stripeEvent("customer.created", { id: "cus_ignored" }),
  ])) {
    assert.deepEqual(await run(processStripeEvent(event)), { received: true })
    assert.deepEqual(await run(processStripeEvent(event)), {
      received: true,
      replay: true,
    })
  }
})

test("failed claim release retains both the processing and cleanup failure", async () => {
  const original = fixture.enderdash.execute
  fixture.enderdash.execute = () =>
    Effect.fail(
      new EnderdashError({
        operation: "execute",
        reason: "rejected",
        message: "offline",
      })
    )
  const event = await checkoutEvent()
  const database = {
    run: <A>(
      operation: string,
      execute: Parameters<typeof fixture.database.run<A>>[1]
    ) =>
      operation === "release-stripe-event"
        ? Effect.fail(new ShopStoreError({ operation, cause: "unavailable" }))
        : fixture.database.run(operation, execute),
  }
  try {
    const outcome = await run(
      Effect.result(
        processStripeEvent(event).pipe(
          Effect.provideService(ShopDatabase, database)
        )
      )
    )
    assert(Result.isFailure(outcome))
    assert.equal(outcome.failure._tag, "WebhookProcessingError")
    if (outcome.failure._tag === "WebhookProcessingError")
      assert(outcome.failure.releaseFailure instanceof ShopStoreError)
    assert.equal((await marker(event.id)).length, 1)
  } finally {
    fixture.enderdash.execute = original
  }
})

test("missing webhook configuration is an operational failure rather than a signature rejection", async () => {
  const result = handleStripeWebhook(
    new Request("https://shop.example", { method: "POST", body: "{}" })
  ).pipe(
    Effect.provideService(StripeGateway, stripeGateway),
    Effect.provideService(ShopSettings, {
      require: (binding) =>
        Effect.fail(
          new ShopConfigurationError({
            binding,
            cause: new Error("configuration unavailable"),
          })
        ),
    })
  )
  await assert.rejects(
    Effect.runPromise(result.pipe(Effect.provide(fixture.layer()))),
    { _tag: "ShopConfigurationError", binding: "STRIPE_SECRET_KEY" }
  )
})

test("subscription termination statuses revoke perks while active subscriptions retain them", async () => {
  const original = fixture.enderdash.execute
  const commands: string[] = []
  fixture.enderdash.execute = (input) =>
    Effect.sync(() => {
      commands.push(input.command)
      return {
        ...input,
        requestId: "request",
        commandResult: 1,
        error: null,
        success: true,
      }
    })
  try {
    for (const status of [
      "canceled",
      "incomplete_expired",
      "past_due",
      "unpaid",
      "active",
    ]) {
      await run(
        processStripeEvent(
          await stripeEvent("customer.subscription.updated", {
            ...subscription(),
            status,
          })
        )
      )
    }
    assert.deepEqual(
      commands,
      Array.from(
        { length: 4 },
        () => "lp user player-uuid parent remove prime_ultra"
      )
    )
  } finally {
    fixture.enderdash.execute = original
  }
})
