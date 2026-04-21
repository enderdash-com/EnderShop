import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client"
import superjson from "superjson"
import { requireStringEnv } from "@/lib/server/worker-env"

interface ExecuteConsoleCommandInput {
  command: string
  organizationId: string
  serverId: string
}

interface ExecuteConsoleCommandResult {
  command: string
  commandResult: string | null
  error: string | null
  requestId: string
  serverId: string
  success: boolean
}

export interface LuckPermsLookup {
  found: boolean
  username?: string
  uuid?: string
  primary_group?: string
  groups: Array<string>
}

export interface LuckPermsSnapshotGroup {
  name: string
  display_name?: string
  weight?: number
}

export interface LuckPermsSnapshotUser {
  uuid: string
  username?: string
  primary_group: string
  groups: Array<LuckPermsSnapshotGroup>
  prefix?: string
  suffix?: string
}

interface LuckPermsResolveResult {
  requestId: string
  serverId: string
  success: boolean
  error: string | null
  lookup: LuckPermsLookup | null
}

interface LuckPermsSnapshotResult {
  requestId: string
  serverId: string
  success: boolean
  error: string | null
  result: { found: boolean; user?: LuckPermsSnapshotUser } | null
}

function requireEnv(name: string) {
  return requireStringEnv(name as never)
}

function getBaseUrl() {
  return requireEnv("ENDERDASH_BASE_URL").replace(/\/$/, "")
}

function getApiKey() {
  return requireEnv("ENDERDASH_API_KEY")
}

function getServerTarget() {
  return {
    organizationId: requireEnv("ENDERDASH_ORGANIZATION_ID"),
    serverId: requireEnv("ENDERDASH_SERVER_ID"),
  }
}

function createClient() {
  return createTRPCUntypedClient({
    links: [
      httpBatchLink({
        headers() {
          return {
            "x-api-key": getApiKey(),
          }
        },
        transformer: superjson,
        url: `${getBaseUrl()}/api/trpc`,
      }),
    ],
  })
}

export async function executeEnderDashConsoleCommand(
  input: ExecuteConsoleCommandInput
) {
  const result = (await createClient().mutation(
    "servers.executeConsoleCommand",
    input
  )) as ExecuteConsoleCommandResult

  if (!result.success) {
    throw new Error(result.error || "EnderDash rejected the console command")
  }

  return result
}

export async function resolveMinecraftUsername(username: string) {
  const target = getServerTarget()
  const result = (await createClient().mutation(
    "servers.resolveLuckPermsUsername",
    {
      ...target,
      username,
    }
  )) as LuckPermsResolveResult

  if (!result.success) {
    throw new Error(result.error || "Could not resolve Minecraft username")
  }

  return result.lookup
}

export async function getLuckPermsSnapshot(input: {
  username?: string
  uuid?: string
}) {
  const target = getServerTarget()
  const result = (await createClient().mutation(
    "servers.getLuckPermsSnapshot",
    {
      ...target,
      ...(input.uuid ? { uuid: input.uuid } : { username: input.username }),
    }
  )) as LuckPermsSnapshotResult

  if (!result.success) {
    throw new Error(result.error || "Could not load LuckPerms snapshot")
  }

  return result.result
}
