import { Link, createFileRoute } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"

export const Route = createFileRoute("/checkout/success")({
  component: CheckoutSuccessPage,
})

function CheckoutSuccessPage() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl items-center px-6 py-10">
      <Card className="w-full border border-border/80">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Checkout complete</CardTitle>
          <CardDescription>
            Stripe accepted the payment. Fulfillment continues in the background
            through the configured EnderDash commands and webhook flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-muted-foreground">
          You can return to the store to review your profile, subscription
          access, and entitlement history.
        </CardContent>
        <CardFooter className="border-t border-border/70">
          <Button render={<Link to="/" />}>Back to EnderShop</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
