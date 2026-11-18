import { getRouteApi } from "@tanstack/react-router"

import { Auth } from "@/components/auth/auth"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

const routeApi = getRouteApi("/auth/$path")

export function AuthPage() {
  const { path } = routeApi.useParams()
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-6 py-12">
        <Auth path={path} />
      </main>
      <SiteFooter />
    </div>
  )
}
