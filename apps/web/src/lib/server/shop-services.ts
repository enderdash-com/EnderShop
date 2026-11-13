import { Context, Data, Effect } from "effect"
import type { getDb } from "./db"

export class ShopConfigurationError extends Data.TaggedError(
  "ShopConfigurationError"
)<{
  readonly binding: string
  readonly cause: unknown
}> {
  override get message() {
    return `Missing required Worker binding: ${this.binding}`
  }
}

export class ShopStoreError extends Data.TaggedError("ShopStoreError")<{
  readonly operation: string
  readonly cause: unknown
}> {
  override get message() {
    return "Shop storage is unavailable. Try again shortly."
  }
}

export class ShopInputError extends Data.TaggedError("ShopInputError")<{
  readonly message: string
}> {}

export class ShopSettings extends Context.Service<
  ShopSettings,
  {
    readonly require: (
      name: string
    ) => Effect.Effect<string, ShopConfigurationError>
  }
>()("endershop/ShopSettings") {}

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
>()("endershop/ShopDatabase") {}

export function makeShopDatabase(
  resolve: () => ShopDb
): Context.Service.Shape<typeof ShopDatabase> {
  return {
    // D1 cannot cancel a submitted statement. Wait for its result before a
    // surrounding operation releases a claim or starts recovery.
    run: (operation, execute) =>
      Effect.tryPromise({
        try: async () => execute(resolve()),
        catch: (cause) => new ShopStoreError({ operation, cause }),
      }).pipe(Effect.uninterruptible),
  }
}

export const databaseOperation = <TValue>(
  operation: string,
  execute: (db: ShopDb) => PromiseLike<TValue>
) =>
  Effect.flatMap(ShopDatabase, (database) => database.run(operation, execute))
