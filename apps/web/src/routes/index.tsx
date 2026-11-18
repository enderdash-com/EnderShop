import { createFileRoute } from "@tanstack/react-router"

import { App } from "@/components/pages/home-page"
import { shopPageHead } from "@/lib/shop/seo"
import { getShopSite } from "@/lib/shop/site"

export const Route = createFileRoute("/")({
  loader: () => getShopSite(),
  head: ({ loaderData }) =>
    shopPageHead(
      "/",
      "Minecraft ranks and perks",
      "Buy Minecraft ranks and perks. Permissions are granted automatically, usually within seconds.",
      loaderData
    ),
  component: App,
})
