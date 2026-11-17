import assert from "node:assert/strict"
import { test } from "node:test"

import { shopOrigin, shopPageHead } from "./seo"

const site = {
  origin: "https://ranks.example.org",
  name: "Example Network",
  image: "https://ranks.example.org/social-card.png",
}

test("public storefront requests replace the development origin", () => {
  const request = new URL("https://shop-demo.enderdash.com/legal/terms")
  for (const development of [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://[::1]:5173",
    "http://shop.localhost:5173",
  ]) {
    assert.equal(shopOrigin(development, request), request.origin)
  }
})

test("configured public origins remain canonical across aliases", () => {
  assert.equal(
    shopOrigin(site.origin, new URL("https://alias.example.org/")),
    site.origin
  )
})

test("missing configuration and local development use the request origin", () => {
  const request = new URL("http://localhost:5173/legal/terms")
  assert.equal(shopOrigin(undefined, request), request.origin)
  assert.equal(shopOrigin(request.origin, request), request.origin)
})

test("legal metadata describes the document and uses the storefront origin", () => {
  const head = shopPageHead(
    "/legal/privacy",
    "Privacy Policy",
    "How we handle your information.",
    site
  )
  assert.deepEqual(head.links, [
    { rel: "canonical", href: "https://ranks.example.org/legal/privacy" },
  ])
  for (const tag of [
    { title: "Privacy Policy · Example Network" },
    { property: "og:description", content: "How we handle your information." },
    { property: "og:image", content: site.image },
    { name: "twitter:image", content: site.image },
  ])
    assert.ok(
      head.meta.some((actual) => JSON.stringify(actual) === JSON.stringify(tag))
    )
})

test("different storefronts do not canonicalize to the demo", () => {
  const head = shopPageHead("/", "Ranks", "Get a rank.", {
    ...site,
    origin: "https://another.example.org",
  })
  assert.equal(head.links[0]?.href, "https://another.example.org/")
})

test("unavailable loader data does not invent a canonical URL", () => {
  const head = shopPageHead(
    "/legal/terms",
    "Terms of Service",
    "Purchase terms.",
    undefined
  )
  assert.deepEqual(head.links, [])
  assert.deepEqual(head.meta[0], { title: "Terms of Service · EnderShop" })
})
