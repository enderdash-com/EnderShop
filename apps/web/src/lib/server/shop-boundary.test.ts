import assert from "node:assert/strict"
import { test } from "node:test"
import { Effect, Fiber } from "effect"
import { publicShopEffect } from "./shop-boundary"
import { ShopInputError, ShopStoreError } from "./shop-services"

test("framework errors preserve public messages without transporting typed causes", async () => {
  const internal = new ShopStoreError({
    operation: "profile-write",
    cause: new Error("SQL parameters contain private credentials"),
  })
  await assert.rejects(
    Effect.runPromise(publicShopEffect(Effect.fail(internal))),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(
        error.message,
        "Shop storage is unavailable. Try again shortly."
      )
      assert.equal(structuredClone(error).cause, undefined)
      // TanStack's serializer reads non-enumerable own properties too.
      assert.equal(
        JSON.stringify(Object.getOwnPropertyDescriptors(error)).includes(
          "private credentials"
        ),
        false
      )
      assert.equal(Reflect.has(error, "operation"), false)
      return true
    }
  )
  assert.equal(internal.operation, "profile-write")
  assert.ok(internal.cause instanceof Error)
})

test("input failures retain their public text at the framework boundary", async () => {
  await assert.rejects(
    Effect.runPromise(
      publicShopEffect(
        Effect.fail(
          new ShopInputError({
            message: "Create an account before purchasing.",
          })
        )
      )
    ),
    { message: "Create an account before purchasing." }
  )
  assert.equal(
    await Effect.runPromise(publicShopEffect(Effect.succeed("ready"))),
    "ready"
  )
})

test("the public boundary preserves interruption and waits for cleanup", async () => {
  let cleaned = false
  await Effect.runPromise(
    Effect.gen(function* () {
      const fiber = yield* publicShopEffect(
        Effect.never.pipe(
          Effect.ensuring(
            Effect.sync(() => {
              cleaned = true
            })
          )
        )
      ).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      yield* Fiber.interrupt(fiber)
    })
  )
  assert.equal(cleaned, true)
})
