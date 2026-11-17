import { Effect } from "effect"

/** Keep typed causes inside services; framework serializers can expose error properties. */
export function publicShopEffect<TValue, TError, TContext>(
  program: Effect.Effect<TValue, TError, TContext>
) {
  return program.pipe(
    Effect.mapError(
      (error) =>
        // oxlint-disable-next-line effecttsgo/global-error-in-effect-failure -- the framework boundary exposes only a plain message
        new Error(
          error instanceof Error ? error.message : "Shop operation failed."
        )
    )
  )
}
