# Repository instructions

## Server workflows and Effect

- Compose fallible shop workflows as native Effect v4 programs. Keep pure calculations and React rendering as ordinary functions.
- Supply dependencies through `ShopDatabase`, `ShopSettings`, `EnderdashGateway`, `StripeGateway`, and `ShopSession`.
- Use `runShopEffect` only at HTTP, TanStack, or Better Auth callbacks. Compose Effects directly inside services.
- Keep typed failures and their causes inside services. The runtime boundary exposes public messages without private provider or database details.
- Wait for submitted D1 statements before releasing their resources. Use atomic D1 batches for related writes.
- Preserve sequential fulfillment, Stripe event deduplication, and failed-event replay. Do not retry payment mutations or console commands automatically.
- Finish submitted mutations and their saved results before cancellation returns. Use scoped resources and the Effect clock for HTTP deadlines.
- Use Enderdash's `/api/http/servers/` endpoints with a user API key. Validate responses and preserve uncertain command outcomes.
- From `apps/web`, run `bun test src/lib/server/*.test.ts src/lib/shop/input-schemas.test.ts` for workflow behavior.
- From the repository root, run `bun run build` for the production build and type checking. Run `bun run lint` separately.

## React conventions

- Use PascalCase for React component names. Match the existing component filename convention.
- Use kebab-case for new hook and utility filenames, unless this repository documents another convention.
- Use stable domain identities as React keys. Do not use array indexes as keys.
- Use an existing `generateN` helper or stable placeholder IDs for fixed skeleton slots.
- Keep page structure, headings, navigation, labels, and independent content mounted while data loads.
- Show skeletons only for unresolved values, rows, and permission-dependent actions. Do not block a page on its slowest query.

## Tailwind spacing

- Use `gap-*` utilities for spacing between elements. Do not use `space-*` utilities.

## shadcn/ui

- For shadcn/ui work, use the `shadcn` skill and component documentation.
- Compose existing shadcn/ui components before writing custom primitives. Use `Field`, `InputGroup`, and `Item` where appropriate.
- Fix application consumers before changing `components/ui`. Change a shared primitive only for a demonstrated component defect.

## Design skills

- For visual design work, use `frontend-design` and `uncodixfy`.

## Cloudflare tooling

- Use `cf` for direct Cloudflare CLI commands. Prefer existing package scripts for project workflows.
- For new Cloudflare configuration, prefer `cloudflare.config.ts`. Preserve existing configuration formats during unrelated work.

## Drizzle migrations

- Edit the schema referenced by `apps/web/drizzle.config.ts` first.
- From `apps/web/`, run `bunx --bun drizzle-kit generate --name <migration-name>`.
- Treat `apps/web/drizzle/` SQL and metadata as generated output. Do not hand-edit them.
- Commit generated migration artifacts together, exactly as Drizzle produces them.
- Check the deployment workflow before applying migrations. Do not assume a push applies them automatically.

## Effect server workflows

- Run app tests with `bun run --cwd apps/web test`. Run `typecheck`, `lint`, and `build` from the same package before committing server changes.
- Business operations in `src/lib/server` return native Effect programs. Use `Context.Service` capabilities for settings, D1, Stripe, Enderdash, and the current session. Keep pure catalog, rank, and command helpers direct.
- Call `runShopEffect` only at TanStack, HTTP, or Better Auth boundaries. Supply the session from the current request. Do not start nested runtimes inside services.
- Resolve Worker settings lazily so profile operations do not require payment or game-server secrets.
- D1 statements and submitted Stripe or game-server mutations must settle before cancellation returns. Keep webhook processing and claim release in one protected region. Never add transport retries to mutations.
- Preserve Stripe event deduplication and release the event marker after failed processing. A replay can repeat earlier completed fulfillment commands. Do not claim exactly-once fulfillment or add automatic reconciliation without durable checkpoints.
- Use the Enderdash HTTP API at `/api/http/servers/…` with `X-API-Key`. Decode responses with Effect Schema, bound body reads and deadlines, and close readers on interruption. Distinguish rejected and uncertain command outcomes.
- Use local Miniflare D1 tests with the committed migrations for persistence behavior. Test public outcomes, mutation order, replay, partial failure, cancellation, and request isolation.
