import { createFileRoute } from "@tanstack/react-router"

import { CheckoutCancelPage } from "@/components/pages/checkout-cancel-page"

export const Route = createFileRoute("/checkout/cancel")({
  component: CheckoutCancelPage,
})
