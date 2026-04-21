# EnderShop

EnderShop is a TanStack Start monorepo configured for Cloudflare Workers.

It now uses:

- `@cloudflare/vite-plugin` for Workers-compatible local development and build output
- Cloudflare D1 for persistence
- Drizzle ORM for schema and query access
- Better Auth with anonymous guest sessions and email/password accounts
- Stripe Checkout for one-time and subscription rank products
- EnderDash console execution for fulfillment
- shadcn/ui on the Base UI primitive layer with Tailwind CSS v4 and RTL support

## Workspace

- `apps/web`: the storefront, Worker config, auth routes, Stripe handlers, D1 access, and fulfillment code
- `packages/ui`: shared Base UI / shadcn components and global styles

## Quick start

1. Copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars`.
2. Replace the placeholder Stripe, EnderDash, and legal/company values.
3. Install dependencies:

```bash
bun install
```

4. Generate Cloudflare Worker types:

```bash
bun run --cwd apps/web cf-typegen
```

5. Start local development:

```bash
bun run dev
```

The app runs through Vite in the Workers runtime via the Cloudflare Vite plugin.

## What is already wired

- `apps/web/src/routes/api/auth/$` mounts Better Auth for TanStack Start.
- `apps/web/src/routes/api/shop/checkout` creates Stripe Checkout Sessions.
- `apps/web/src/routes/api/stripe/webhook` handles Stripe webhooks and updates entitlements.
- `apps/web/src/lib/server/enderdash.ts` sends console execution requests to EnderDash over its tRPC HTTP API using an API key.
- `apps/web/src/lib/server/product-config.ts` maps shop products to Stripe price IDs and command templates.
- `apps/web/src/lib/server/schema.ts` defines the Drizzle schema used on D1.
- `apps/web/wrangler.jsonc` defines the Worker runtime and D1 binding.

## Important bindings and local vars

- `DB`: Cloudflare D1 database binding
- `BETTER_AUTH_URL`: public URL of EnderShop
- `BETTER_AUTH_SECRET`: Better Auth secret
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `STRIPE_PRICE_*`: Stripe price IDs for the sample products
- `ENDERDASH_BASE_URL`: EnderDash app base URL
- `ENDERDASH_API_KEY`: EnderDash API key sent as `x-api-key`
- `ENDERDASH_ORGANIZATION_ID`: EnderDash organization scope for fulfillment
- `ENDERDASH_SERVER_ID`: EnderDash server scope for fulfillment
- `SHOP_COMPANY_*`: provider details used by the legal pages

## Product and fulfillment mapping

Public shop metadata lives in:

- `apps/web/src/lib/shop/catalog.ts`

Stripe and EnderDash fulfillment mapping lives in:

- `apps/web/src/lib/server/product-config.ts`

If you want different rank names or command templates, update that server config file.

## Drizzle and D1

The Drizzle schema lives in:

- `apps/web/src/lib/server/schema.ts`

The Drizzle config lives in:

- `apps/web/drizzle.config.ts`

Generate future migrations with:

```bash
bun run --cwd apps/web db:generate
```

The current scaffold also bootstraps its tables at runtime so a fresh D1 database can come up during early development without a separate migration step.

## Cloudflare deployment

Deploy from the app workspace:

```bash
bun run --cwd apps/web deploy
```

Before production deployment, replace the placeholder values in `wrangler.jsonc` and move sensitive values to real Wrangler secrets where appropriate.

## Legal routes

The storefront includes:

- `/legal/terms`
- `/legal/privacy`
- `/legal/cookies`
- `/legal/imprint`
