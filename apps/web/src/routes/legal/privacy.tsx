import { createFileRoute } from "@tanstack/react-router"

import { PrivacyPage } from "@/components/pages/privacy-page"
import { shopPageHead } from "@/lib/shop/seo"
import { getShopSite } from "@/lib/shop/site"

export const Route = createFileRoute("/legal/privacy")({
  loader: () => getShopSite(),
  head: ({ loaderData }) =>
    shopPageHead(
      "/legal/privacy",
      "Privacy Policy",
      "How this storefront handles your account, order, and delivery information.",
      loaderData
    ),
  component: PrivacyPage,
})
