import { Effect, Layer } from "effect"
import { getDb } from "./db"
import { EnderdashGateway, makeEnderdashGateway } from "./enderdash"
import { StripeGateway, stripeGateway } from "./stripe-gateway"
import {
  makeShopDatabase,
  ShopConfigurationError,
  ShopDatabase,
  ShopSettings,
} from "./shop-services"
import { requireStringEnv } from "./worker-env"

export type ShopServices =
  | ShopDatabase
  | ShopSettings
  | EnderdashGateway
  | StripeGateway

// Values resolve request bindings only when an operation needs them. Reading a
// profile must not require a Stripe key or Enderdash credentials.
const shopLayer = Layer.mergeAll(
  Layer.succeed(ShopDatabase, makeShopDatabase(getDb)),
  Layer.succeed(ShopSettings, {
    require: (name) =>
      Effect.try({
        try: () =>
          requireStringEnv(name as keyof typeof import("./worker-env").env),
        catch: (cause) => new ShopConfigurationError({ binding: name, cause }),
      }),
  }),
  Layer.succeed(EnderdashGateway, makeEnderdashGateway()),
  Layer.succeed(StripeGateway, stripeGateway)
)

export function runShopEffect<A, E>(
  program: Effect.Effect<A, E, ShopServices>,
  signal?: AbortSignal
): Promise<A> {
  return Effect.runPromise(program.pipe(Effect.provide(shopLayer)), { signal })
}
