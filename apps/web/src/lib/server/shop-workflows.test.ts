import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { Effect, Exit } from "effect"
import { eq } from "drizzle-orm"
import {
  beginShopCheckout,
  loadShopState,
  openShopBillingPortal,
  saveShopProfile,
} from "./shop-workflows"
import {
  getCustomerProfile,
  reassignAnonymousUserData,
  updateCustomerProfile,
} from "./store"
import {
  ShopDatabase,
  databaseOperation,
  makeShopDatabase,
} from "./shop-services"
import { shopFixture, unavailableEnderdash } from "./shop-test-fixture"
import { customerProfile } from "./schema"
import type { ShopSettings } from "./shop-services"
import type { EnderdashGateway } from "./enderdash"
import type { StripeGateway } from "./stripe-gateway"
import type { ShopSession } from "./shop-workflows"

let fixture: Awaited<ReturnType<typeof shopFixture>>
before(async () => {
  fixture = await shopFixture()
  await fixture.addUser("customer")
})
after(async () => fixture.worker.dispose())
const run = <TValue, TError>(
  program: Effect.Effect<
    TValue,
    TError,
    ShopDatabase | ShopSettings | EnderdashGateway | StripeGateway | ShopSession
  >
) => Effect.runPromise(program.pipe(Effect.provide(fixture.layer())))

test("anonymous and unauthenticated users cannot start checkout", async () => {
  for (const user of [null, { id: "customer", isAnonymous: true }]) {
    await assert.rejects(
      Effect.runPromise(
        beginShopCheckout("prime", new Request("https://shop.example")).pipe(
          Effect.provide(fixture.layer(user))
        )
      ),
      {
        message: user ? "Create an account before purchasing." : "Unauthorized",
      }
    )
  }
})

test("profile validation uses verified Minecraft identity and rejects a conflicting account", async () => {
  const profile = await run(saveShopProfile("Player"))
  assert.equal(profile.minecraftUuid, "player-uuid")
  await fixture.addUser("conflict")
  await assert.rejects(
    run(
      updateCustomerProfile({
        userId: "conflict",
        minecraftUsername: "Player",
        minecraftUuid: "player-uuid",
      })
    ),
    {
      message:
        "That Minecraft account is already linked to another shop account.",
    }
  )
})

test("rank lookup failure blocks checkout instead of treating the player as rankless", async () => {
  const original = fixture.enderdash.snapshot
  let checkouts = 0
  const checkout = fixture.stripe.checkout
  fixture.enderdash.snapshot = unavailableEnderdash
  fixture.stripe.checkout = () => {
    checkouts++
    return Effect.succeed({ url: "https://unexpected.example" })
  }
  try {
    await assert.rejects(
      run(beginShopCheckout("prime", new Request("https://shop.example"))),
      { message: "Enderdash is unavailable. Try again shortly." }
    )
    assert.equal(checkouts, 0)
  } finally {
    fixture.enderdash.snapshot = original
    fixture.stripe.checkout = checkout
  }
})

test("checkout composes rank eligibility and product metadata before a single Stripe mutation", async () => {
  const original = fixture.stripe.checkout
  const inputs: Array<Parameters<typeof original>[0]> = []
  fixture.stripe.checkout = (input) => {
    inputs.push(input)
    return Effect.succeed({ url: "https://checkout.example/session" })
  }
  try {
    assert.deepEqual(
      await run(
        beginShopCheckout("prime", new Request("https://shop.example"))
      ),
      { url: "https://checkout.example/session" }
    )
    assert.equal(inputs.length, 1)
    assert.equal(inputs[0].mode, "payment")
    assert.deepEqual(inputs[0].metadata, {
      minecraftUsername: "Player",
      minecraftUuid: "player-uuid",
      productId: "prime",
      productKind: "base_rank",
      tier: "prime",
      userId: "customer",
    })
    assert.equal(
      inputs[0].success_url,
      "https://shop.example/checkout/success?session_id={CHECKOUT_SESSION_ID}"
    )
  } finally {
    fixture.stripe.checkout = original
  }
})

test("billing rejects an account with no linked Stripe customer", async () => {
  await assert.rejects(
    run(openShopBillingPortal(new Request("https://shop.example"))),
    { message: "No billing account is linked to your account yet." }
  )
})

test("shop state keeps independent request users isolated", async () => {
  await fixture.addUser("other")
  await Effect.runPromise(
    saveShopProfile("Other").pipe(
      Effect.provide(fixture.layer({ id: "other" })),
      Effect.provideService(ShopDatabase, fixture.database),
      Effect.catchTag("ShopInputError", () => Effect.void)
    )
  )
  const [first, second] = await Promise.all([
    Effect.runPromise(
      loadShopState().pipe(Effect.provide(fixture.layer({ id: "customer" })))
    ),
    Effect.runPromise(
      loadShopState().pipe(Effect.provide(fixture.layer({ id: "other" })))
    ),
  ])
  assert.equal(first.profile.minecraftUuid, "player-uuid")
  assert.equal(second.profile.minecraftUuid, null)
})

test("anonymous profile transfer moves a unique UUID atomically and preserves target values", async () => {
  await fixture.addUser("guest")
  await fixture.addUser("registered")
  await run(
    updateCustomerProfile({
      userId: "guest",
      minecraftUuid: "guest-uuid",
      minecraftUsername: "Guest",
    })
  )
  await run(
    reassignAnonymousUserData({
      previousUserId: "guest",
      newUserId: "registered",
    })
  )
  assert.equal(
    (await run(getCustomerProfile("registered"))).minecraftUuid,
    "guest-uuid"
  )
  assert.equal((await run(getCustomerProfile("guest"))).updatedAt, null)
  await run(
    reassignAnonymousUserData({
      previousUserId: "registered",
      newUserId: "registered",
    })
  )
  assert.equal(
    (await run(getCustomerProfile("registered"))).minecraftUuid,
    "guest-uuid"
  )
})

test("failed profile transfer rolls back deletion of the previous profile", async () => {
  await assert.rejects(
    run(
      reassignAnonymousUserData({
        previousUserId: "registered",
        newUserId: "missing-user",
      })
    ),
    { message: "Shop storage is unavailable. Try again shortly." }
  )
  assert.equal(
    (await run(getCustomerProfile("registered"))).minecraftUuid,
    "guest-uuid"
  )
})

test("a submitted D1 operation settles before cancellation returns", async () => {
  let start!: () => void
  let finish!: () => void
  const started = new Promise<void>((resolve) => {
    start = resolve
  })
  const pending = new Promise<string>((resolve) => {
    finish = () => resolve("written")
  })
  const controller = new AbortController()
  const database = makeShopDatabase(() => fixture.db)
  let settled = false
  const result = Effect.runPromiseExit(
    databaseOperation("delayed-write", () => {
      start()
      return pending
    }).pipe(Effect.provideService(ShopDatabase, database)),
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
})

test("missing profiles keep their public null shape", async () => {
  const profile = await run(getCustomerProfile("missing"))
  assert.deepEqual(profile, {
    minecraftUsername: null,
    minecraftUuid: null,
    stripeCustomerId: null,
    updatedAt: null,
  })
  const rows = await fixture.db
    .select()
    .from(customerProfile)
    .where(eq(customerProfile.userId, "missing"))
  assert.equal(rows.length, 0)
})

test("profile transfer preserves an existing identity and fills a missing Stripe customer", async () => {
  await fixture.addUser("second-guest")
  await run(
    updateCustomerProfile({
      userId: "second-guest",
      minecraftUuid: "second-uuid",
      minecraftUsername: "Second",
    })
  )
  await fixture.db
    .update(customerProfile)
    .set({ stripeCustomerId: "cus_second" })
    .where(eq(customerProfile.userId, "second-guest"))
  await run(
    reassignAnonymousUserData({
      previousUserId: "second-guest",
      newUserId: "registered",
    })
  )
  const target = await run(getCustomerProfile("registered"))
  assert.equal(target.minecraftUuid, "guest-uuid")
  assert.equal(target.minecraftUsername, "Guest")
  assert.equal(target.stripeCustomerId, "cus_second")
  assert.equal((await run(getCustomerProfile("second-guest"))).updatedAt, null)
})

test("subscription checkout retains Stripe subscription metadata and existing customer", async () => {
  await fixture.db
    .update(customerProfile)
    .set({ stripeCustomerId: "cus_customer" })
    .where(eq(customerProfile.userId, "customer"))
  const oldSnapshot = fixture.enderdash.snapshot
  const oldCheckout = fixture.stripe.checkout
  const inputs: Array<Parameters<typeof oldCheckout>[0]> = []
  fixture.enderdash.snapshot = () =>
    Effect.succeed({
      found: true,
      user: {
        uuid: "player-uuid",
        primary_group: "prime",
        groups: [{ name: "prime" }],
      },
    })
  fixture.stripe.checkout = (input) => {
    inputs.push(input)
    return Effect.succeed({ url: "https://checkout.example/subscription" })
  }
  try {
    await run(
      beginShopCheckout("prime_ultra", new Request("https://shop.example"))
    )
    assert.equal(inputs[0].mode, "subscription")
    assert.equal(inputs[0].customer, "cus_customer")
    assert.equal(inputs[0].customer_email, undefined)
    assert.deepEqual(inputs[0].subscription_data?.metadata, inputs[0].metadata)
  } finally {
    fixture.enderdash.snapshot = oldSnapshot
    fixture.stripe.checkout = oldCheckout
  }
})

test("billing portal uses the linked Stripe customer and current request origin", async () => {
  const original = fixture.stripe.portal
  const inputs: Array<Parameters<typeof original>[0]> = []
  fixture.stripe.portal = (input) => {
    inputs.push(input)
    return Effect.succeed({ url: "https://billing.example/portal" })
  }
  try {
    assert.deepEqual(
      await run(
        openShopBillingPortal(new Request("https://shop.example/account"))
      ),
      { url: "https://billing.example/portal" }
    )
    assert.deepEqual(inputs, [
      { customer: "cus_customer", return_url: "https://shop.example/" },
    ])
  } finally {
    fixture.stripe.portal = original
  }
})
