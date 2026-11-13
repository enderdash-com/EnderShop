import { Data, Effect } from "effect"
import { executeEnderdashConsoleCommand } from "./enderdash"
import { renderCommand, resolveProductConfig } from "./product-config"
import { ULTRA_TIER_GROUPS } from "./shop-state"
import { setting } from "./shop-services"
import type { RankTier } from "@/lib/shop/types"

interface FulfillmentTarget {
  uuid: string
  username: string
}

export class FulfillmentError extends Data.TaggedError("FulfillmentError")<{
  readonly commandIndex: number
  readonly completedCommands: number
  readonly cause: unknown
}> {
  override get message() {
    return `Fulfillment failed after ${this.completedCommands} completed commands. The failed command may require reconciliation.`
  }
}

export const runFulfillmentCommands = Effect.fn("Shop.runFulfillmentCommands")(
  function* (input: { commands: Array<string>; target: FulfillmentTarget }) {
    const organizationId = yield* setting("ENDERDASH_ORGANIZATION_ID")
    const serverId = yield* setting("ENDERDASH_SERVER_ID")
    for (const [commandIndex, template] of input.commands.entries()) {
      yield* executeEnderdashConsoleCommand({
        command: renderCommand(template, input.target),
        organizationId,
        serverId,
      }).pipe(
        Effect.mapError(
          (cause) =>
            new FulfillmentError({
              commandIndex,
              completedCommands: commandIndex,
              cause,
            })
        )
      )
    }
  },
  Effect.uninterruptible
)

export const fulfillProductPurchase = Effect.fn("Shop.fulfillProductPurchase")(
  function* (input: { productId: string; target: FulfillmentTarget }) {
    const config = yield* resolveProductConfig(input.productId)
    yield* runFulfillmentCommands({
      commands: config.commands.grantCommands,
      target: input.target,
    })
  }
)

export const revokeUltraGroup = (input: {
  tier: RankTier
  target: FulfillmentTarget
}) =>
  runFulfillmentCommands({
    commands: [
      `lp user {{uuid}} parent remove ${ULTRA_TIER_GROUPS[input.tier]}`,
    ],
    target: input.target,
  })
