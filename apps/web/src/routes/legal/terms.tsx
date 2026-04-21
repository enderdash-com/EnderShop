import { createFileRoute } from "@tanstack/react-router"
import { LegalPage } from "@/components/legal-page"

export const Route = createFileRoute("/legal/terms")({
  component: TermsPage,
})

function TermsPage() {
  return (
    <LegalPage
      description="Rules for buying one-time and subscription-based Minecraft ranks through EnderShop."
      title="Terms of Service"
    >
      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">1. Service scope</h2>
        <p>
          EnderShop sells digital entitlements for Minecraft rank products.
          Delivery is handled by Stripe for billing and by EnderDash for command
          execution against the configured server.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">2. Purchase behavior</h2>
        <p>
          One-time products are charged once and intended to stay active unless a
          refund, fraud reversal, or administrative correction requires the rank
          to be removed.
        </p>
        <p>
          Subscription products renew automatically until canceled through the
          customer billing portal or otherwise terminated in Stripe.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">3. Fulfillment target</h2>
        <p>
          You are responsible for providing the correct Minecraft username.
          EnderShop sends that value into the configured fulfillment commands. If
          the supplied username is wrong, delivery can fail or affect the wrong
          account.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">4. Delivery timing</h2>
        <p>
          Rank delivery usually happens quickly after a successful Stripe event,
          but it still depends on webhook delivery, EnderDash reachability, and
          the target server being available.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">5. Refunds and reversals</h2>
        <p>
          If a payment is refunded, disputed, or otherwise reversed, the related
          rank may be revoked. Subscription ranks may also be removed when the
          subscription becomes canceled, unpaid, or otherwise inactive.
        </p>
      </section>
    </LegalPage>
  )
}
