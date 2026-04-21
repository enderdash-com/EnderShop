import { createFileRoute } from "@tanstack/react-router"
import { ensureAppDatabase, getSessionFromHeaders } from "@/lib/server/auth"
import {
  ensureCustomerProfile,
  updateCustomerProfile,
} from "@/lib/server/store"

const usernamePattern = /^[A-Za-z0-9_]{3,16}$/

export const Route = createFileRoute("/api/shop/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await ensureAppDatabase()
        const session = await getSessionFromHeaders(request.headers)

        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        return Response.json(await ensureCustomerProfile(session.user.id))
      },
      PATCH: async ({ request }) => {
        await ensureAppDatabase()
        const session = await getSessionFromHeaders(request.headers)

        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = (await request.json()) as {
          minecraftUsername?: string
        }

        const minecraftUsername = body.minecraftUsername?.trim()

        if (!minecraftUsername || !usernamePattern.test(minecraftUsername)) {
          return Response.json(
            {
              error:
                "Minecraft usernames must be 3-16 characters using letters, numbers, or underscores.",
            },
            { status: 400 }
          )
        }

        return Response.json(
          await updateCustomerProfile({
            minecraftUsername,
            userId: session.user.id,
          })
        )
      },
    },
  },
})
