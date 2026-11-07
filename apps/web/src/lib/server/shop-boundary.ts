import { Effect } from "effect"

/** Keep typed causes inside services; framework serializers can expose error properties. */
export function publicShopEffect<A, E, R>(program: Effect.Effect<A, E, R>) {
  return program.pipe(
    Effect.mapError(
      (error) =>
        new Error(
          error instanceof Error ? error.message : "Shop operation failed."
        )
    )
  )
}
