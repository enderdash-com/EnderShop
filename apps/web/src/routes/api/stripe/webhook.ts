import { createFileRoute } from "@tanstack/react-router"
import { ensureAppDatabase } from "@/lib/server/auth"
import { handleStripeWebhook } from "@/lib/server/stripe"

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await ensureAppDatabase()
        return handleStripeWebhook(request)
      },
    },
  },
})
