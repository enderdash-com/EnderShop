import { createFileRoute } from "@tanstack/react-router"
import { LegalPage } from "@/components/legal-page"
import { getLegalCompanyInfo } from "@/lib/server/legal"

export const Route = createFileRoute("/legal/imprint")({
  component: ImprintPage,
  loader: () => getLegalCompanyInfo(),
})

function ImprintPage() {
  const company = Route.useLoaderData()

  return (
    <LegalPage
      description="Provider information for the EnderShop storefront."
      title="Imprint"
    >
      <section className="flex flex-col gap-2">
        <p className="text-foreground">{company.name}</p>
        <p>
          {company.street}
          <br />
          {company.city}
          <br />
          {company.country}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">Contact</h2>
        <p>{company.email}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">VAT</h2>
        <p>{company.vatId}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">Note</h2>
        <p>
          Replace the placeholder organization details in `wrangler.jsonc` or
          your bound Worker secrets before going live.
        </p>
      </section>
    </LegalPage>
  )
}
