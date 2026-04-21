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

function requireEnv(name: string) {
  return requireStringEnv(name as never)
}

function getBaseUrl() {
  return requireEnv("ENDERDASH_BASE_URL").replace(/\/$/, "")
}

function getApiKey() {
  return requireEnv("ENDERDASH_API_KEY")
}

export async function executeEnderDashConsoleCommand(
  input: ExecuteConsoleCommandInput
) {
  const client = createTRPCUntypedClient({
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

  const result = (await client.mutation(
    "executeConsoleCommand",
    input
  )) as ExecuteConsoleCommandResult

  if (!result.success) {
    throw new Error(result.error || "EnderDash rejected the console command")
  }

  return result
}
