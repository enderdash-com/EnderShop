import { createFileRoute } from "@tanstack/react-router"
import { ensureAppDatabase, getSessionFromHeaders } from "@/lib/server/auth"
import { createBillingPortalSession } from "@/lib/server/stripe"

export const Route = createFileRoute("/api/shop/portal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await ensureAppDatabase()
        const session = await getSessionFromHeaders(request.headers)

        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        try {
          const portal = await createBillingPortalSession({
            request,
            userId: session.user.id,
          })

          return Response.json(portal)
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Billing portal could not be opened.",
            },
            { status: 400 }
          )
        }
      },
    },
  },
})
