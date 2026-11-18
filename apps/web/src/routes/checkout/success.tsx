import { createFileRoute } from "@tanstack/react-router"

import { CheckoutSuccessPage } from "@/components/pages/checkout-success-page"

export const Route = createFileRoute("/checkout/success")({
  component: CheckoutSuccessPage,
})
