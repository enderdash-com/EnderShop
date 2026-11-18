import { createFileRoute } from "@tanstack/react-router"

import { ImprintPage } from "@/components/pages/imprint-page"
import { shopPageHead } from "@/lib/shop/seo"
import { getShopSite } from "@/lib/shop/site"

export const Route = createFileRoute("/legal/imprint")({
  loader: () => getShopSite(),
  head: ({ loaderData }) =>
    shopPageHead(
      "/legal/imprint",
      "Imprint",
      "Provider information for the operator of this storefront.",
      loaderData
    ),
  component: ImprintPage,
})
