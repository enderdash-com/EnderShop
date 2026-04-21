import { createFileRoute } from "@tanstack/react-router"
import { LegalPage } from "@/components/legal-page"

export const Route = createFileRoute("/legal/cookies")({
  component: CookiePage,
})

function CookiePage() {
  return (
    <LegalPage
      description="What cookies and similar technologies this storefront uses."
      title="Cookie Policy"
    >
      <blockquote>
        <strong>Placeholder.</strong> You must replace this document with your
        own Cookie Policy that accurately describes the cookies and similar
        technologies your storefront uses. The text below is a generic
        template and does not constitute legal advice.
      </blockquote>

      <h2>1. What cookies are</h2>
      <p>
        Cookies are small text files that are placed on your device when you
        visit a website. They are widely used to make sites work, or work more
        efficiently, as well as to provide information to the operators of the
        site.
      </p>

      <h2>2. Cookies we set</h2>
      <p>
        We try to keep our cookie use to a minimum. The cookies we rely on to
        operate the Service are strictly necessary:
      </p>
      <ul>
        <li>
          <strong>Session cookie</strong> keeps you signed in and preserves
          guest sessions so your cart and order context are not lost between
          page loads;
        </li>
        <li>
          <strong>Security cookie</strong> protects forms and account actions
          from cross-site request forgery;
        </li>
        <li>
          <strong>Preference cookie</strong> remembers small settings such as
          your chosen color theme.
        </li>
      </ul>

      <h2>3. Third-party cookies</h2>
      <p>
        When you leave the storefront to complete payment, the payment
        provider may set its own cookies on its domain according to its own
        cookie policy. We do not control those cookies.
      </p>

      <h2>4. Managing cookies</h2>
      <p>
        You can control or delete cookies through your browser settings. Note
        that disabling strictly necessary cookies may break parts of the
        Service, including sign-in and checkout.
      </p>

      <h2>5. Changes</h2>
      <p>
        If the cookies we use change in any meaningful way, we will update
        this page.
      </p>

      <p>
        <em>Last updated: replace with a real date.</em>
      </p>
    </LegalPage>
  )
}
