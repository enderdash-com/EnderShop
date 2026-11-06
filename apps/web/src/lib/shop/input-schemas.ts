import { Schema } from "effect"

const usernamePattern = /^[A-Za-z0-9_]{3,16}$/

export const saveProfileSchema = Schema.Struct({
  minecraftUsername: Schema.Trim.check(
    Schema.isPattern(usernamePattern, {
      message: "Use 3-16 characters: letters, numbers, or underscores.",
    })
  ),
})

export const startCheckoutSchema = Schema.Struct({
  productId: Schema.String.check(Schema.isMinLength(1)),
})
