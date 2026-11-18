import { viewPaths } from "@better-auth-ui/core"
import { createFileRoute, redirect } from "@tanstack/react-router"

import { AuthPage } from "@/components/pages/auth-page"

export const Route = createFileRoute("/auth/$path")({
  beforeLoad({ params: { path } }) {
    if (!Object.values(viewPaths.auth).includes(path)) {
      throw redirect({ to: "/" })
    }
  },
  component: AuthPage,
})
