import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { Effect, Schema } from "effect"
import {
  saveProfileSchema,
  startCheckoutSchema,
} from "@/lib/shop/input-schemas"
import { getSessionFromHeaders } from "./auth"
import { runShopEffect, type ShopServices } from "./shop-runtime"
import {
  beginShopCheckout,
  loadShopState,
  openShopBillingPortal,
  saveShopProfile,
  ShopSession,
  ShopSessionError,
} from "./shop-workflows"

export type { ShopStatePayload } from "./shop-workflows"

function runSessionEffect<A, E>(
  program: Effect.Effect<A, E, ShopServices | ShopSession>
) {
  const request = getRequest()
  return runShopEffect(
    program.pipe(
      Effect.provideService(ShopSession, {
        current: Effect.tryPromise({
          try: async () =>
            (await getSessionFromHeaders(request.headers))?.user ?? null,
          catch: (cause) => new ShopSessionError({ cause }),
        }),
      })
    ),
    request.signal
  )
}

export const getShopState = createServerFn({ method: "GET" }).handler(() =>
  runSessionEffect(loadShopState())
)
export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator(Schema.toStandardSchemaV1(saveProfileSchema))
  .handler(({ data }) =>
    runSessionEffect(saveShopProfile(data.minecraftUsername))
  )
export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator(Schema.toStandardSchemaV1(startCheckoutSchema))
  .handler(({ data }) =>
    runSessionEffect(beginShopCheckout(data.productId, getRequest()))
  )
export const openBillingPortal = createServerFn({ method: "POST" }).handler(
  () => runSessionEffect(openShopBillingPortal(getRequest()))
)
