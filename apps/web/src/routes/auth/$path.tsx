import { viewPaths } from "@better-auth-ui/react/core"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Auth } from "@/components/auth/auth"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export const Route = createFileRoute("/auth/$path")({
  beforeLoad({ params: { path } }) {
    if (!Object.values(viewPaths.auth).includes(path)) {
      throw redirect({ to: "/" })
    }
  },
  component: AuthPage,
})

function AuthPage() {
  const { path } = Route.useParams()
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
