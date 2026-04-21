import { createFileRoute } from "@tanstack/react-router"
import { LegalPage } from "@/components/legal-page"

export const Route = createFileRoute("/legal/terms")({
  component: TermsPage,
})

function TermsPage() {
  return (
    <LegalPage
      description="Rules for buying one-time and subscription-based Minecraft ranks through this storefront."
      title="Terms of Service"
    >
      <blockquote>
        <strong>Placeholder.</strong> You must replace this document with your
        own Terms of Service before going live. The text below is a generic
        template meant to show prose formatting, not legal advice. Review
        your local laws and consult a qualified lawyer where needed.
      </blockquote>

      <h2>1. Who we are</h2>
      <p>
        These Terms of Service (the &ldquo;Terms&rdquo;) govern your use of our
        Minecraft rank storefront (the &ldquo;Service&rdquo;). By creating an
        account, placing an order, or continuing to browse, you agree to be
        bound by these Terms. If you do not agree, please stop using the
        Service.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You may only use the Service if you are at least the age of majority in
        your jurisdiction, or if you have permission from a parent or legal
        guardian. By placing an order, you confirm that any payment method you
        use is your own or that you have explicit authorization to use it.
      </p>

      <h2>3. Orders and payment</h2>
      <p>
        All prices are displayed in the catalog and include applicable taxes
        unless stated otherwise. Payment is processed by our payment provider
        at checkout. An order is only considered complete once payment has been
        confirmed.
      </p>
      <ul>
        <li>
          <strong>Lifetime ranks</strong> are charged once and intended to
          remain active indefinitely, subject to the rest of these Terms.
        </li>
        <li>
          <strong>Subscription ranks</strong> renew automatically at the
          interval displayed in the product description until canceled.
        </li>
      </ul>

      <h2>4. Delivery</h2>
      <p>
        Ranks are normally delivered to the Minecraft username you provide
        within a few seconds of a successful payment. Delivery relies on the
        target server being reachable at the time of purchase. If delivery
        fails, please contact us so we can resolve it manually.
      </p>

      <h2>5. Cancellations and refunds</h2>
      <p>
        You may cancel a subscription at any time through the billing portal.
        Cancellation stops future renewals and removes access at the end of the
        current billing period.
      </p>
      <p>
        Because digital rank deliveries are performed immediately, refunds for
        lifetime purchases are handled on a case-by-case basis. Contact us if
        you believe something has gone wrong.
      </p>

      <h2>6. Prohibited conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use stolen or unauthorized payment methods;</li>
        <li>Buy ranks for accounts you do not own or control;</li>
        <li>Abuse refunds, chargebacks, or promotional offers;</li>
        <li>Interfere with, probe, or disrupt the Service.</li>
      </ul>

      <h2>7. Chargebacks</h2>
      <p>
        If a payment is disputed or reversed, the corresponding rank may be
        revoked and the account associated with the purchase may be suspended
        until the dispute is resolved.
      </p>

      <h2>8. Changes to the Service</h2>
      <p>
        We may update the catalog, the perks attached to a rank, or these
        Terms over time. Material changes will be announced on the storefront.
        Continued use of the Service after a change means you accept the
        updated Terms.
      </p>

      <h2>9. Contact</h2>
      <p>
        For questions about these Terms or a specific order, reach out at{" "}
        <a href="mailto:support@example.com">support@example.com</a>.
      </p>

      <p>
        <em>Last updated: replace with a real date.</em>
      </p>
    </LegalPage>
  )
}
