import { createFileRoute } from "@tanstack/react-router"
import { runShopEffect } from "@/lib/server/shop-runtime"
import { handleStripeWebhook } from "@/lib/server/stripe"

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: ({ request }) =>
        runShopEffect(handleStripeWebhook(request), request.signal),
    },
  },
})
