export interface ShopSite {
  origin: string
  name: string
  image: string
}

export function shopOrigin(
  configuredUrl: string | null | undefined,
  requestUrl: URL
) {
  const configured = configuredUrl ? new URL(configuredUrl) : requestUrl
  const isLoopback = (url: URL) =>
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]"

  return isLoopback(configured) && !isLoopback(requestUrl)
    ? requestUrl.origin
    : configured.origin
}

export function shopPageHead(
  path: string,
  title: string,
  description: string,
  site: ShopSite | undefined
) {
  const pageTitle = `${title} · ${site?.name ?? "EnderShop"}`
  const url = site ? new URL(path, site.origin).href : undefined
  return {
    links: url ? [{ rel: "canonical", href: url }] : [],
    meta: [
      { title: pageTitle },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: description },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: description },
      ...(site && url
        ? [
            { property: "og:site_name", content: site.name },
            { property: "og:url", content: url },
            { property: "og:image", content: site.image },
            { name: "twitter:image", content: site.image },
          ]
        : []),
    ],
  }
}
