import { Link } from "@tanstack/react-router"
import { LogoMark } from "@/components/logo"

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-muted/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LogoMark className="size-4" />
            <span className="tracking-wide">
              &copy; {new Date().getFullYear()} EnderShop. All ranks delivered
              automatically.
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-5 text-xs tracking-wider text-muted-foreground uppercase">
            <Link className="transition-colors hover:text-foreground" to="/legal/terms">
              Terms
            </Link>
            <Link className="transition-colors hover:text-foreground" to="/legal/privacy">
              Privacy
            </Link>
            <Link className="transition-colors hover:text-foreground" to="/legal/cookies">
              Cookies
            </Link>
            <Link className="transition-colors hover:text-foreground" to="/legal/imprint">
              Imprint
            </Link>
          </nav>
        </div>
        <p className="border-t border-border/50 pt-4 text-[10px] leading-relaxed tracking-[0.18em] text-muted-foreground uppercase">
          Not an official Minecraft product. Not approved by or associated with
          Mojang or Microsoft.
        </p>
      </div>
    </footer>
  )
}
