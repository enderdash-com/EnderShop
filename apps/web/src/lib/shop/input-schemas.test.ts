import assert from "node:assert/strict"
import { test } from "node:test"
import { Schema } from "effect"
import { saveProfileSchema, startCheckoutSchema } from "./input-schemas"

test("profile input trims usernames and rejects invalid names", () => {
  const decode = Schema.decodeUnknownSync(saveProfileSchema)
  assert.deepEqual(
    decode({ minecraftUsername: "  Player_123  ", extra: true }),
    { minecraftUsername: "Player_123" }
  )
  for (const minecraftUsername of [
    "ab",
    "a".repeat(17),
    "player-name",
    "",
    null,
  ]) {
    assert.throws(() => decode({ minecraftUsername }))
  }
})

test("checkout requires a nonempty product identifier", () => {
  const decode = Schema.decodeUnknownSync(startCheckoutSchema)
  assert.deepEqual(decode({ productId: "rank-prime" }), {
    productId: "rank-prime",
  })
  for (const input of [{}, { productId: "" }, { productId: 1 }])
    assert.throws(() => decode(input))
})
