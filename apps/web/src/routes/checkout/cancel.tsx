import { Link, createFileRoute } from "@tanstack/react-router"
import { XCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export const Route = createFileRoute("/checkout/cancel")({
  component: CheckoutCancelPage,
})

function CheckoutCancelPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center border border-border bg-card">
          <XCircle className="size-6 text-muted-foreground" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Checkout canceled
          </h1>
          <p className="text-balance text-sm leading-relaxed text-muted-foreground">
            No worries, you weren&rsquo;t charged. Pick another rank whenever
            you&rsquo;re ready.
          </p>
        </div>
        <Button render={<Link to="/" />}>Back to shop</Button>
      </main>
      <SiteFooter />
    </div>
  )
}
