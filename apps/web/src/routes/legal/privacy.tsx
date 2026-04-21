import { createFileRoute } from "@tanstack/react-router"
import { LegalPage } from "@/components/legal-page"

export const Route = createFileRoute("/legal/privacy")({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <LegalPage
      description="How this storefront handles your account, order, and delivery information."
      title="Privacy Policy"
    >
      <blockquote>
        <strong>Placeholder.</strong> You must replace this document with your
        own Privacy Policy that accurately reflects how your storefront
        processes player data. The text below is a generic template to
        demonstrate prose formatting, not legal advice. Consult a qualified
        lawyer when in doubt.
      </blockquote>

      <h2>1. Who is responsible</h2>
      <p>
        The operator of this storefront is responsible for the personal data
        processed through it. Contact details are published on the imprint
        page.
      </p>

      <h2>2. Information we collect</h2>
      <p>
        We collect only the information we need to fulfill your orders and run
        the shop safely:
      </p>
      <ul>
        <li>
          <strong>Account details</strong> such as your email address, display
          name, and authentication state;
        </li>
        <li>
          <strong>Minecraft username</strong> provided by you to target rank
          deliveries;
        </li>
        <li>
          <strong>Order and subscription records</strong> including the
          products purchased, price paid, and delivery status;
        </li>
        <li>
          <strong>Technical data</strong> such as IP address, user agent, and
          basic request metadata used for security and abuse prevention.
        </li>
      </ul>

      <h2>3. How we use your information</h2>
      <p>We use collected information to:</p>
      <ul>
        <li>Deliver the ranks you purchase to the server you select;</li>
        <li>Operate subscription renewals and refunds;</li>
        <li>Communicate about orders, outages, and policy changes;</li>
        <li>Detect and prevent fraud or abuse.</li>
      </ul>

      <h2>4. Sharing with third parties</h2>
      <p>
        We rely on a small number of service providers to run the shop. These
        include our payment processor, our hosting provider, and our email
        provider. Each only receives what they need to perform their function.
      </p>

      <h2>5. Retention</h2>
      <p>
        We keep order and payment records for as long as required by law
        (typically for tax purposes) and delete other personal data when it is
        no longer necessary for the purposes listed above.
      </p>

      <h2>6. Your rights</h2>
      <p>Depending on your jurisdiction, you may have the right to:</p>
      <ul>
        <li>Request access to the data we hold about you;</li>
        <li>Request correction or deletion of inaccurate data;</li>
        <li>Object to or restrict certain kinds of processing;</li>
        <li>Lodge a complaint with your supervisory authority.</li>
      </ul>

      <h2>7. International transfers</h2>
      <p>
        Some of our service providers may process data in countries other than
        your own. Where required, we rely on appropriate safeguards such as
        standard contractual clauses.
      </p>

      <h2>8. Children</h2>
      <p>
        The Service is not intended for children below the age of majority in
        their jurisdiction. Do not place orders without the permission of a
        parent or legal guardian.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes
        will be announced on the storefront.
      </p>

      <h2>10. Contact</h2>
      <p>
        For privacy questions or to exercise any of the rights above, write to{" "}
        <a href="mailto:privacy@example.com">privacy@example.com</a>.
      </p>

      <p>
        <em>Last updated: replace with a real date.</em>
      </p>
    </LegalPage>
  )
}
