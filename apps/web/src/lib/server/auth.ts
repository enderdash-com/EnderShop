import { betterAuth } from "better-auth"
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { anonymous } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { getDb } from "@/lib/server/db"
import { ensureAppDatabase } from "@/lib/server/bootstrap"
import { schema } from "@/lib/server/schema"
import { reassignAnonymousUserData } from "@/lib/server/store"
import { requireStringEnv } from "@/lib/server/worker-env"

function getBaseUrl() {
  return requireStringEnv("BETTER_AUTH_URL")
}

function getSecret() {
  return requireStringEnv("BETTER_AUTH_SECRET")
}

export const auth = betterAuth({
  appName: "EnderShop",
  baseURL: getBaseUrl(),
  secret: getSecret(),
  database: drizzleAdapter(getDb(), {
    provider: "sqlite",
    schema,
    transaction: false,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    anonymous({
      generateName: () => `Guest ${crypto.randomUUID().slice(0, 8)}`,
      generateRandomEmail: () =>
        `guest-${crypto.randomUUID()}@guest.endershop.local`,
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await reassignAnonymousUserData({
          newUserId: newUser.user.id,
          previousUserId: anonymousUser.user.id,
        })
      },
    }),
    tanstackStartCookies(),
  ],
})

export async function getSessionFromHeaders(headers: Headers) {
  await ensureAppDatabase()
  return auth.api.getSession({ headers })
}

export { ensureAppDatabase }
