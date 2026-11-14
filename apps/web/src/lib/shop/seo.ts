export interface ShopSite {
  origin: string
  name: string
  image: string
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
