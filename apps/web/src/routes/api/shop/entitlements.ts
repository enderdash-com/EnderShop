import { createFileRoute } from "@tanstack/react-router"
import { ensureAppDatabase, getSessionFromHeaders } from "@/lib/server/auth"
import {
  ensureCustomerProfile,
  listEntitlementsForUser,
} from "@/lib/server/store"

export const Route = createFileRoute("/api/shop/entitlements")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await ensureAppDatabase()
        const session = await getSessionFromHeaders(request.headers)

        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        return Response.json({
          entitlements: await listEntitlementsForUser(session.user.id),
          profile: await ensureCustomerProfile(session.user.id),
        })
      },
    },
  },
})
