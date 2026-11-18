import { useSession } from "@better-auth-ui/react"
import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

import { Settings } from "@/components/auth/settings/settings"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { authClient } from "@/lib/auth-client"

const routeApi = getRouteApi("/settings/$path")

export function SettingsPage() {
  const { path } = routeApi.useParams()
  const { data: session, isPending } = useSession(authClient)
  const navigate = useNavigate()
  const isAnonymous = session?.user.isAnonymous ?? false

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
