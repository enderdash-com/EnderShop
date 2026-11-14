import { createServerFn } from "@tanstack/react-start"
import { getRequestUrl } from "@tanstack/react-start/server"
import { shopOrigin } from "./seo"

export const getShopSite = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getOptionalStringEnv } = await import("@/lib/server/worker-env")
    const origin = shopOrigin(
      getOptionalStringEnv("BETTER_AUTH_URL"),
      getRequestUrl()
    )
    return {
      origin,
      name: getOptionalStringEnv("SHOP_COMPANY_NAME") ?? "EnderShop",
      image: new URL(
        getOptionalStringEnv("SHOP_SOCIAL_IMAGE_URL") ?? "/social-card.png",
        origin
      ).href,
    }
  }
)
