import { createFileRoute } from "@tanstack/react-router"
import { auth, ensureAppDatabase } from "@/lib/server/auth"

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await ensureAppDatabase()
        return auth.handler(request)
      },
      POST: async ({ request }) => {
        await ensureAppDatabase()
        return auth.handler(request)
      },
    },
  },
})
