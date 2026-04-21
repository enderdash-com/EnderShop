import type { RankTier } from "@/lib/shop/types"
import { executeEnderDashConsoleCommand } from "@/lib/server/enderdash"
import { renderCommand, resolveProductConfig } from "@/lib/server/product-config"
import { ULTRA_TIER_GROUPS } from "@/lib/server/shop-state"
import { requireStringEnv } from "@/lib/server/worker-env"

interface FulfillmentTarget {
  uuid: string
  username: string
}

function getTarget() {
  return {
    organizationId: requireStringEnv("ENDERDASH_ORGANIZATION_ID"),
    serverId: requireStringEnv("ENDERDASH_SERVER_ID"),
  }
}

async function runCommands(input: {
  commands: Array<string>
  target: FulfillmentTarget
}) {
  const { organizationId, serverId } = getTarget()
  for (const template of input.commands) {
    const command = renderCommand(template, input.target)
    await executeEnderDashConsoleCommand({
      command,
      organizationId,
      serverId,
    })
  }
}

export async function fulfillProductPurchase(input: {
  productId: string
  target: FulfillmentTarget
}) {
  const config = resolveProductConfig(input.productId)
  await runCommands({
    commands: config.commands.grantCommands,
    target: input.target,
  })
}

export async function revokeUltraGroup(input: {
  tier: RankTier
  target: FulfillmentTarget
}) {
  const group = ULTRA_TIER_GROUPS[input.tier]
  await runCommands({
    commands: [`lp user {{uuid}} parent remove ${group}`],
    target: input.target,
  })
}
