import { Link, createFileRoute } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"

export const Route = createFileRoute("/checkout/cancel")({
  component: CheckoutCancelPage,
})

function CheckoutCancelPage() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl items-center px-6 py-10">
      <Card className="w-full border border-border/80">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Checkout canceled</CardTitle>
          <CardDescription>
            Nothing was charged. You can update the profile or choose a
            different product whenever you are ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-muted-foreground">
          Your guest or full account session is still available, so your player
          details and existing purchases stay intact.
        </CardContent>
        <CardFooter className="border-t border-border/70">
          <Button render={<Link to="/" />}>Return to catalog</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
