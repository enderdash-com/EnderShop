import type { RankEntitlement } from "@/lib/shop/types"
import { createFulfillmentLog, updateEntitlementFulfillment } from "@/lib/server/store"
import { executeEnderDashConsoleCommand } from "@/lib/server/enderdash"
import { resolveProductConfig } from "@/lib/server/product-config"

function renderTemplate(
  template: string,
  input: { entitlementId: string; minecraftUsername: string; productId: string }
) {
  return template
    .replaceAll("{{minecraftUsername}}", input.minecraftUsername)
    .replaceAll("{{productId}}", input.productId)
    .replaceAll("{{entitlementId}}", input.entitlementId)
}

async function runCommands(input: {
  commands: Array<string>
  entitlement: RankEntitlement
  phase: "grant" | "revoke"
}) {
  const product = resolveProductConfig(input.entitlement.productId)

  for (const template of input.commands) {
    const command = renderTemplate(template, {
      entitlementId: input.entitlement.id,
      minecraftUsername: input.entitlement.minecraftUsername,
      productId: input.entitlement.productId,
    })

    try {
      const response = await executeEnderDashConsoleCommand({
        command,
        organizationId: product.target.organizationId,
        serverId: product.target.serverId,
      })

      await createFulfillmentLog({
        command,
        entitlementId: input.entitlement.id,
        outcome: "success",
        phase: input.phase,
        responseJson: JSON.stringify(response),
      })

      await updateEntitlementFulfillment({
        commandError: null,
        commandResult: response.commandResult,
        entitlementId: input.entitlement.id,
        fulfillmentStatus:
          input.phase === "grant" ? "granted" : "revoked",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      await createFulfillmentLog({
        command,
        entitlementId: input.entitlement.id,
        outcome: "error",
        phase: input.phase,
        responseJson: JSON.stringify({ error: message }),
      })

      await updateEntitlementFulfillment({
        commandError: message,
        commandResult: "FAILED",
        entitlementId: input.entitlement.id,
        fulfillmentStatus: "error",
      })

      throw error
    }
  }
}

export async function grantRankEntitlement(entitlement: RankEntitlement) {
  const product = resolveProductConfig(entitlement.productId)
  await runCommands({
    commands: product.commands.grantCommands,
    entitlement,
    phase: "grant",
  })
}

export async function revokeRankEntitlement(entitlement: RankEntitlement) {
  const product = resolveProductConfig(entitlement.productId)
  if (product.commands.revokeCommands.length === 0) {
    await updateEntitlementFulfillment({
      commandError: null,
      commandResult: "SUCCESS",
      entitlementId: entitlement.id,
      fulfillmentStatus: "revoked",
    })
    return
  }

  await runCommands({
    commands: product.commands.revokeCommands,
    entitlement,
    phase: "revoke",
  })
}
