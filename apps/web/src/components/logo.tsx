import { cn } from "@workspace/ui/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      fill="none"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="22"
        stroke="currentColor"
        strokeWidth="2"
        transform="rotate(45 20 20)"
        width="22"
        x="9"
        y="9"
      />
      <rect
        fill="currentColor"
        height="10"
        transform="rotate(45 20 20)"
        width="10"
        x="15"
        y="15"
      />
      <rect fill="currentColor" height="2" width="2" x="2" y="2" />
      <rect fill="currentColor" height="2" width="2" x="36" y="2" />
      <rect fill="currentColor" height="2" width="2" x="2" y="36" />
      <rect fill="currentColor" height="2" width="2" x="36" y="36" />
    </svg>
  )
}

interface LogoProps {
  className?: string
  showSubtitle?: boolean
}

export function Logo({ className, showSubtitle = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark className="size-10" />
      <div className="flex flex-col leading-none">
        <span className="font-heading text-lg font-semibold tracking-[0.22em] uppercase">
          EnderShop
        </span>
        {showSubtitle ? (
          <span className="mt-1.5 text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
            Ranks &middot; Perks &middot; Support
          </span>
        ) : null}
      </div>
    </div>
  )
}
