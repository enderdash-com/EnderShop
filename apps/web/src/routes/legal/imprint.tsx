import { createFileRoute } from "@tanstack/react-router"
import { LegalPage } from "@/components/legal-page"

export const Route = createFileRoute("/legal/imprint")({
  component: ImprintPage,
})

function ImprintPage() {
  return (
    <LegalPage
      description="Provider information for the operator of this storefront."
      title="Imprint"
    >
      <blockquote>
        <strong>Placeholder.</strong> Replace the details below with your real
        provider information. In some jurisdictions (for example Germany under
        &sect; 5 TMG) an imprint is legally required. Consult a qualified
        lawyer if you are unsure what your storefront must disclose.
      </blockquote>

      <h2>Operator</h2>
      <p>
        Your Company Name
        <br />
        Replace Street 1
        <br />
        12345 Replace City
        <br />
        Country
      </p>

      <h2>Represented by</h2>
      <p>Jane Doe, Managing Director</p>

      <h2>Contact</h2>
      <p>
        Email:{" "}
        <a href="mailto:hello@example.com">hello@example.com</a>
        <br />
        Phone: +00 000 000 000
      </p>

      <h2>Register entry</h2>
      <p>
        Registered at: Local Court of Replace City
        <br />
        Register number: HRB 000000
      </p>

      <h2>VAT identification</h2>
      <p>
        VAT ID according to &sect; 27 a of the German Value Added Tax Act:
        DE000000000
      </p>

      <h2>Responsible for content</h2>
      <p>
        Jane Doe (address as above)
      </p>

      <h2>Online dispute resolution</h2>
      <p>
        The European Commission provides a platform for online dispute
        resolution at{" "}
        <a
          href="https://ec.europa.eu/consumers/odr"
          rel="noreferrer"
          target="_blank"
        >
          ec.europa.eu/consumers/odr
        </a>
        . We are not obliged to participate in a dispute resolution procedure
        before a consumer arbitration board.
      </p>

      <h2>Liability</h2>
      <p>
        Despite careful content control, we assume no liability for the
        content of external links. The operators of linked pages are solely
        responsible for their content.
      </p>

      <p>
        <em>Last updated: replace with a real date.</em>
      </p>
    </LegalPage>
  )
}
