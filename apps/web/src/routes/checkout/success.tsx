import { Link, createFileRoute } from "@tanstack/react-router"
import { CheckCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export const Route = createFileRoute("/checkout/success")({
  component: CheckoutSuccessPage,
})

function CheckoutSuccessPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center border border-border bg-card">
          <CheckCircle className="size-6" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Payment received
          </h1>
          <p className="text-balance text-sm leading-relaxed text-muted-foreground">
            Your rank is on its way. Permissions usually apply within a few
            seconds. Jump back in-game and enjoy.
          </p>
        </div>
        <Button render={<Link to="/" />}>Back to shop</Button>
      </main>
      <SiteFooter />
    </div>
  )
}
