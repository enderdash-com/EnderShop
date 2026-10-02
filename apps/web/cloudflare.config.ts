import { bindings, defineConfig } from "cf/config"
export default defineConfig({
  worker: {
    name: "enderdash-shop-demo",
    compatibilityDate: "2026-04-21",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "@tanstack/react-start/server-entry",
    observability: {
      issues: {
        enabled: true,
      },
      enabled: true,
      headSamplingRate: 1,
    },
    env: {
      BETTER_AUTH_URL: bindings.text("http://localhost:5173"),
      BETTER_AUTH_SECRET: bindings.text("replace-me-with-a-secret"),
      ENDERDASH_API_KEY: bindings.text("replace-me-with-an-api-key"),
      ENDERDASH_BASE_URL: bindings.text("https://app.enderdash.com"),
      ENDERDASH_ORGANIZATION_ID: bindings.text("replace-with-organization-id"),
      ENDERDASH_SERVER_ID: bindings.text("replace-with-server-id"),
      SHOP_COMPANY_CITY: bindings.text("Berlin"),
      SHOP_COMPANY_COUNTRY: bindings.text("Germany"),
      SHOP_COMPANY_EMAIL: bindings.text("legal@example.com"),
      SHOP_COMPANY_NAME: bindings.text("EnderShop"),
      SHOP_COMPANY_STREET: bindings.text("Replace Street 1"),
      SHOP_COMPANY_VAT_ID: bindings.text("Replace VAT ID"),
      STRIPE_PRICE_FOUNDER_LIFETIME: bindings.text("price_replace_founder"),
      STRIPE_PRICE_LEGEND_LIFETIME: bindings.text("price_replace_legend"),
      STRIPE_PRICE_NETWORK_PLUS_MONTHLY: bindings.text(
        "price_replace_network_plus"
      ),
      STRIPE_PRICE_SENTINEL_MONTHLY: bindings.text("price_replace_sentinel"),
      STRIPE_SECRET_KEY: bindings.text("sk_test_replace_me"),
      STRIPE_WEBHOOK_SECRET: bindings.text("whsec_replace_me"),
      DB: bindings.d1({
        name: "endershop",
        id: "3f150b65-5c7a-4abf-9320-cc3a42fd7559",
      }),
    },
  },
})
