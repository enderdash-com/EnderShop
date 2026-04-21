import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { Logo } from "@/components/logo"
import { ModeToggle } from "@/components/mode-toggle"

interface SiteHeaderProps {
  accountSlot?: ReactNode
}

export function SiteHeader({ accountSlot }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link className="transition-opacity hover:opacity-80" to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          {accountSlot}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
