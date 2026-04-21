import { viewPaths } from "@better-auth-ui/react/core"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { Settings } from "@/components/settings/settings"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export const Route = createFileRoute("/settings/$path")({
  beforeLoad({ params: { path } }) {
    if (!Object.values(viewPaths.settings).includes(path)) {
      throw notFound()
    }
  },
  component: SettingsPage,
})

function SettingsPage() {
  const { path } = Route.useParams()
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Settings path={path} />
      </main>
      <SiteFooter />
    </div>
  )
}
