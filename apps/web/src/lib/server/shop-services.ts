import { Context, Effect, Schema } from "effect"

import type { getDb } from "./db"

export class ShopConfigurationError extends Schema.TaggedError<
  ShopConfigurationError,
  { readonly brand: unique symbol }
>()("ShopConfigurationError", {
  binding: Schema.String,
  cause: Schema.Unknown,
}) {
  override get message() {
    return `Missing required Worker binding: ${this.binding}`
  }
}

export class ShopStoreError extends Schema.TaggedError<
  ShopStoreError,
  { readonly brand: unique symbol }
>()("ShopStoreError", {
  operation: Schema.String,
  cause: Schema.Unknown,
}) {
  override get message() {
    return "Shop storage is unavailable. Try again shortly."
  }
}

export class ShopInputError extends Schema.TaggedError<
  ShopInputError,
  { readonly brand: unique symbol }
>()("ShopInputError", {
  message: Schema.String,
}) {}

export class ShopSettings extends Context.Service<
  ShopSettings,
  {
    readonly require: (
      name: string
    ) => Effect.Effect<string, ShopConfigurationError>
  }
>()("web/lib/server/shop-services/ShopSettings") {}

export const setting = (name: string) =>
  Effect.flatMap(ShopSettings, (settings) => settings.require(name))

type ShopDb = ReturnType<typeof getDb>

export class ShopDatabase extends Context.Service<
  ShopDatabase,
  {
    readonly run: <TValue>(
      operation: string,
      execute: (db: ShopDb) => PromiseLike<TValue>
    ) => Effect.Effect<TValue, ShopStoreError>
  }
>()("web/lib/server/shop-services/ShopDatabase") {}

export function makeShopDatabase(
  resolve: () => ShopDb
): Context.Service.Shape<typeof ShopDatabase> {
  return {
    // D1 cannot cancel a submitted statement. Wait for its result before a
    // surrounding operation releases a claim or starts recovery.
    run: (operation, execute) =>
      Effect.tryPromise({
        try: async () => execute(resolve()),
        catch: (cause) => ShopStoreError.make({ operation, cause }),
      }).pipe(Effect.uninterruptible),
  }
}

export const databaseOperation = <TValue>(
  operation: string,
  execute: (db: ShopDb) => PromiseLike<TValue>
) =>
  Effect.flatMap(ShopDatabase, (database) => database.run(operation, execute))
