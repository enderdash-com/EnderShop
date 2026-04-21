import { useSession } from "@better-auth-ui/react"
import { viewPaths } from "@better-auth-ui/react/core"
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
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
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const isAnonymous =
    (session?.user as { isAnonymous?: boolean } | undefined)?.isAnonymous ??
    false

  useEffect(() => {
    if (isPending) return
    if (isAnonymous || !session) {
      void navigate({
        to: "/auth/$path",
        params: { path: "sign-in" },
        replace: true,
      })
    }
  }, [isAnonymous, isPending, navigate, session])

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {session && !isAnonymous ? <Settings path={path} /> : null}
      </main>
      <SiteFooter />
    </div>
  )
}
