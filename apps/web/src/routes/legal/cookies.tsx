import { createFileRoute } from "@tanstack/react-router"
import { LegalPage } from "@/components/legal-page"

export const Route = createFileRoute("/legal/cookies")({
  component: CookiePage,
})

function CookiePage() {
  return (
    <LegalPage
      description="How EnderShop uses cookies and session storage in the storefront."
      title="Cookie Policy"
    >
      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">1. Essential cookies</h2>
        <p>
          EnderShop uses Better Auth session cookies to keep users signed in and
          to preserve guest-account state while purchases and profile updates are
          being processed.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">2. Operational use</h2>
        <p>
          These cookies are used to authenticate requests, associate Stripe
          checkout activity with the current account, and protect the store from
          losing session state between page loads.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">3. Third-party payment flow</h2>
        <p>
          When you leave EnderShop for Stripe Checkout, Stripe may set its own
          cookies under its domain according to Stripe&apos;s own policies.
        </p>
      </section>
    </LegalPage>
  )
}
