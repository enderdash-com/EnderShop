import { viewPaths } from "@better-auth-ui/core"
import { createFileRoute, notFound } from "@tanstack/react-router"

import { SettingsPage } from "@/components/pages/settings-page"

export const Route = createFileRoute("/settings/$path")({
  beforeLoad({ params: { path } }) {
    if (!Object.values(viewPaths.settings).includes(path)) {
      throw notFound()
    }
  },
  component: SettingsPage,
})
