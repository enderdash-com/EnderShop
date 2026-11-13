import { Effect } from "effect"

/** Keep typed causes inside services; framework serializers can expose error properties. */
export function publicShopEffect<TValue, TError, TContext>(
  program: Effect.Effect<TValue, TError, TContext>
) {
  return program.pipe(
    Effect.mapError(
      (error) =>
        new Error(
          error instanceof Error ? error.message : "Shop operation failed."
        )
    )
  )
}
