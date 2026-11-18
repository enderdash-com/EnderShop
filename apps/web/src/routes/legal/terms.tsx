import { createFileRoute } from "@tanstack/react-router"

import { TermsPage } from "@/components/pages/terms-page"
import { shopPageHead } from "@/lib/shop/seo"
import { getShopSite } from "@/lib/shop/site"

export const Route = createFileRoute("/legal/terms")({
  loader: () => getShopSite(),
  head: ({ loaderData }) =>
    shopPageHead(
      "/legal/terms",
      "Terms of Service",
      "Rules for buying one-time and subscription-based Minecraft ranks through this storefront.",
      loaderData
    ),
  component: TermsPage,
})
