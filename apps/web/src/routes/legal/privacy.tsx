import { createFileRoute } from "@tanstack/react-router"
import { LegalPage } from "@/components/legal-page"
import { getLegalCompanyInfo } from "@/lib/server/legal"

export const Route = createFileRoute("/legal/privacy")({
  component: PrivacyPage,
  loader: () => getLegalCompanyInfo(),
})

function PrivacyPage() {
  const company = Route.useLoaderData()

  return (
    <LegalPage
      description="How EnderShop handles account, billing, and fulfillment data."
      title="Privacy Policy"
    >
      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">1. Data we store</h2>
        <p>
          EnderShop stores account records, anonymous session transitions,
          Minecraft usernames, product selections, Stripe checkout metadata, and
          fulfillment logs needed to track rank delivery.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">2. Payment processing</h2>
        <p>
          Card and subscription billing is handled by Stripe. EnderShop stores
          the Stripe identifiers needed to reconcile payments, subscriptions,
          and webhooks, but it does not directly store raw card details.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">3. Fulfillment data</h2>
        <p>
          To deliver ranks, EnderShop sends the configured Minecraft username and
          mapped command templates to EnderDash. EnderDash then issues the final
          console command against the target server.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">4. Contact</h2>
        <p>
          For privacy requests, contact {company.name} at {company.email}.
        </p>
      </section>
    </LegalPage>
  )
}
