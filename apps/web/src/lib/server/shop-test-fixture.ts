import { readFile } from "node:fs/promises"
import { drizzle } from "drizzle-orm/d1"
import { Effect, Layer } from "effect"
import { Miniflare } from "miniflare"
import Stripe from "stripe"
import { EnderdashError, EnderdashGateway } from "./enderdash"
import * as schema from "./schema"
import { ShopDatabase, ShopSettings, makeShopDatabase } from "./shop-services"
import { ShopSession } from "./shop-workflows"
import { StripeGateway } from "./stripe-gateway"
import type { ShopUser } from "./shop-workflows"
import type { Context } from "effect"

type Mutable<T> = { -readonly [P in keyof T]: T[P] }

export async function shopFixture() {
  const worker = new Miniflare({
    workers: [
      {
        config: {
          name: "shop-test",
          compatibilityDate: "2026-09-26",
          manifest: {
            mainModule: "worker.js",
            modules: {
              "worker.js": {
                type: "esm",
                contents:
                  "export default { fetch() { return new Response('test') } }",
              },
            },
          },
          env: { DB: { type: "d1", id: "shop-test" } },
        },
      },
    ],
  })
  const d1 = await worker.getD1Database("DB")
  const migration = await readFile(
    new URL("../../../drizzle/0000_opposite_lorna_dane.sql", import.meta.url),
    "utf8"
  )
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) await d1.prepare(statement).run()
  }
  const db = drizzle(d1, { schema })
  const database = makeShopDatabase(() => db)
  const calls: Array<string> = []
  const settings: Context.Service.Shape<typeof ShopSettings> = {
    require: (name) =>
      Effect.succeed(
        name === "ENDERDASH_BASE_URL"
          ? "https://dashboard.example/"
          : name === "ENDERDASH_API_KEY"
            ? "test-api-key"
            : name === "STRIPE_WEBHOOK_SECRET"
              ? "whsec_test"
              : `test-${name}`
      ),
  }
  const enderdash: Mutable<Context.Service.Shape<typeof EnderdashGateway>> = {
    execute: (input) =>
      Effect.sync(() => {
        calls.push(input.command)
        return {
          ...input,
          requestId: "request",
          commandResult: 1,
          error: null,
          success: true,
        }
      }),
    resolve: (username) =>
      Effect.succeed({
        found: true,
        username,
        uuid: "player-uuid",
        groups: [],
      }),
    snapshot: () =>
      Effect.succeed({
        found: true,
        user: { uuid: "player-uuid", primary_group: "default", groups: [] },
      }),
  }
  const stripe: Mutable<Context.Service.Shape<typeof StripeGateway>> = {
    checkout: () => Effect.succeed({ url: "https://checkout.example/session" }),
    portal: () => Effect.succeed({ url: "https://billing.example/portal" }),
    subscriptions: () => Effect.succeed([]),
    cancel: () => Effect.void,
    sessions: () => Effect.succeed([]),
    verify: () => Effect.die("Unexpected signature verification"),
  }
  const layer = (
    user: ShopUser | null = { id: "customer", email: "customer@example.test" }
  ) =>
    Layer.mergeAll(
      Layer.succeed(ShopDatabase, database),
      Layer.succeed(ShopSettings, settings),
      Layer.succeed(EnderdashGateway, enderdash),
      Layer.succeed(StripeGateway, stripe),
      Layer.succeed(ShopSession, { current: Effect.succeed(user) })
    )
  async function addUser(id: string) {
    await db
      .insert(schema.user)
      .values({ id, name: id, email: `${id}@example.test` })
  }
  return {
    worker,
    db,
    d1,
    database,
    calls,
    settings,
    enderdash,
    stripe,
    layer,
    addUser,
  }
}

// Use the SDK's verified event type just as the production signature boundary
// does, without asserting hand-written objects into a third-party event union.
const eventStripe = new Stripe("sk_test")
export async function stripeEvent(
  type: string,
  object: object,
  id: string = crypto.randomUUID()
) {
  const payload = JSON.stringify({
    id,
    object: "event",
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    api_version: "2026-03-25.dahlia",
  })
  const signature = await eventStripe.webhooks.generateTestHeaderStringAsync({
    payload,
    secret: "whsec_test",
  })
  return eventStripe.webhooks.constructEventAsync(
    payload,
    signature,
    "whsec_test"
  )
}
export function checkoutEvent(id?: string) {
  return stripeEvent(
    "checkout.session.completed",
    {
      id: "cs_test",
      customer: "cus_test",
      metadata: {
        productId: "elite",
        userId: "customer",
        minecraftUuid: "player-uuid",
        minecraftUsername: "Player",
      },
    },
    id
  )
}

export const unavailableEnderdash = () =>
  Effect.fail(
    new EnderdashError({
      operation: "rank-snapshot",
      reason: "transport",
      message: "Enderdash is unavailable. Try again shortly.",
    })
  )
