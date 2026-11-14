import assert from "node:assert/strict"
import { test } from "node:test"
import { shopPageHead } from "./seo"

const site = {
  origin: "https://ranks.example.org",
  name: "Example Network",
  image: "https://ranks.example.org/social-card.png",
}

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
