import { useSession } from "@better-auth-ui/react"
import { Link } from "@tanstack/react-router"
import { LogIn } from "lucide-react"
import { Logo } from "@/components/logo"
import { ModeToggle } from "@/components/mode-toggle"
import { UserButton } from "@/components/user/user-button"
import { Button } from "@workspace/ui/components/button"

export function SiteHeader() {
  const { data: session, isPending } = useSession()
  const user = session?.user as { isAnonymous?: boolean } | undefined
  const showUserMenu = Boolean(session) && !user?.isAnonymous

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link className="transition-opacity hover:opacity-80" to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          {isPending ? null : showUserMenu ? (
            <UserButton align="end" size="default" themeToggle={false} />
          ) : (
            <Button
              render={
                <Link params={{ path: "sign-in" }} to="/auth/$path" />
              }
              size="sm"
              variant="outline"
            >
              <LogIn className="size-3.5" />
              Sign in
            </Button>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
