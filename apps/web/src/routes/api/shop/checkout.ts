import { createFileRoute } from "@tanstack/react-router"
import { ensureAppDatabase, getSessionFromHeaders } from "@/lib/server/auth"
import { ensureCustomerProfile } from "@/lib/server/store"
import { createCheckoutSession } from "@/lib/server/stripe"

export const Route = createFileRoute("/api/shop/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await ensureAppDatabase()
        const session = await getSessionFromHeaders(request.headers)

        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const profile = await ensureCustomerProfile(session.user.id)
        if (!profile.minecraftUsername) {
          return Response.json(
            {
              error: "Set a Minecraft username before starting checkout.",
            },
            { status: 400 }
          )
        }

        const body = (await request.json()) as {
          productId?: string
        }

        if (!body.productId) {
          return Response.json({ error: "Product is required." }, { status: 400 })
        }

        try {
          const checkout = await createCheckoutSession({
            minecraftUsername: profile.minecraftUsername,
            productId: body.productId,
            request,
            user: {
              email: session.user.email,
              id: session.user.id,
            },
          })

          return Response.json(checkout)
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Checkout session could not be created.",
            },
            { status: 400 }
          )
        }
      },
    },
  },
})
