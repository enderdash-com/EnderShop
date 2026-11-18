import { createFileRoute } from "@tanstack/react-router"

import { CookiePage } from "@/components/pages/cookie-page"
import { shopPageHead } from "@/lib/shop/seo"
import { getShopSite } from "@/lib/shop/site"

export const Route = createFileRoute("/legal/cookies")({
  loader: () => getShopSite(),
  head: ({ loaderData }) =>
    shopPageHead(
      "/legal/cookies",
      "Cookie Policy",
      "What cookies and similar technologies this storefront uses.",
      loaderData
    ),
  component: CookiePage,
})
