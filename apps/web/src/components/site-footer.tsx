import { Link } from "@tanstack/react-router"
import { Separator } from "@workspace/ui/components/separator"

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 pb-10">
      <Separator />
      <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>
          EnderShop runs on Cloudflare Workers, stores entitlements in D1, and
          fulfills paid ranks through EnderDash console execution.
        </p>
        <nav className="flex flex-wrap items-center gap-4">
          <Link className="hover:text-foreground" to="/legal/terms">
            Terms
          </Link>
          <Link className="hover:text-foreground" to="/legal/privacy">
            Privacy
          </Link>
          <Link className="hover:text-foreground" to="/legal/cookies">
            Cookies
          </Link>
          <Link className="hover:text-foreground" to="/legal/imprint">
            Imprint
          </Link>
        </nav>
      </div>
    </footer>
  )
}
