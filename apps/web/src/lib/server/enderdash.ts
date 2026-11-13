import { Context, Data, Effect, Schema } from "effect"
import { setting } from "./shop-services"
import type { ShopConfigurationError, ShopSettings } from "./shop-services"

interface ExecuteConsoleCommandInput {
  command: string
  organizationId: string
  serverId: string
}
const lookupSchema = Schema.Struct({
  found: Schema.Boolean,
  username: Schema.optional(Schema.String),
  uuid: Schema.optional(Schema.String),
  primary_group: Schema.optional(Schema.String),
  groups: Schema.mutable(Schema.Array(Schema.String)),
})
const groupSchema = Schema.Struct({
  name: Schema.String,
  display_name: Schema.optional(Schema.String),
  weight: Schema.optional(Schema.Finite),
})
const snapshotSchema = Schema.Struct({
  found: Schema.Boolean,
  user: Schema.optional(
    Schema.Struct({
      uuid: Schema.String,
      username: Schema.optional(Schema.String),
      primary_group: Schema.String,
      groups: Schema.mutable(Schema.Array(groupSchema)),
      prefix: Schema.optional(Schema.String),
      suffix: Schema.optional(Schema.String),
    })
  ),
})
const resultFields = {
  requestId: Schema.String,
  serverId: Schema.String,
  success: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
}
const commandResponseSchema = Schema.Struct({
  ...resultFields,
  command: Schema.String,
  commandResult: Schema.NullOr(Schema.Finite),
})
const lookupResponseSchema = Schema.Struct({
  ...resultFields,
  lookup: Schema.NullOr(lookupSchema),
})
const snapshotResponseSchema = Schema.Struct({
  ...resultFields,
  result: Schema.NullOr(snapshotSchema),
})
export type LuckPermsLookup = typeof lookupSchema.Type
export type LuckPermsSnapshotGroup = typeof groupSchema.Type
export type LuckPermsSnapshotUser = NonNullable<
  (typeof snapshotSchema.Type)["user"]
>

export class EnderdashError extends Data.TaggedError("EnderdashError")<{
  readonly operation: string
  readonly reason: "transport" | "rejected" | "response"
  readonly message: string
  readonly uncertain?: boolean
  readonly cause?: unknown
}> {}

type GatewayFailure = EnderdashError | ShopConfigurationError
export class EnderdashGateway extends Context.Service<
  EnderdashGateway,
  {
    readonly execute: (
      input: ExecuteConsoleCommandInput
    ) => Effect.Effect<
      typeof commandResponseSchema.Type,
      GatewayFailure,
      ShopSettings
    >
    readonly resolve: (
      username: string
    ) => Effect.Effect<LuckPermsLookup | null, GatewayFailure, ShopSettings>
    readonly snapshot: (input: {
      username?: string
      uuid?: string
    }) => Effect.Effect<
      typeof snapshotSchema.Type | null,
      GatewayFailure,
      ShopSettings
    >
  }
>()("endershop/EnderdashGateway") {}

const target = Effect.gen(function* () {
  return {
    organizationId: yield* setting("ENDERDASH_ORGANIZATION_ID"),
    serverId: yield* setting("ENDERDASH_SERVER_ID"),
  }
})

type EnderdashFetch = (url: string, init: RequestInit) => Promise<Response>

export function makeEnderdashGateway(
  fetcher: EnderdashFetch = fetch
): Context.Service.Shape<typeof EnderdashGateway> {
  const request = <TValue>(
    operation: string,
    input: object,
    schema: Schema.Decoder<TValue>,
    submitted: boolean
  ) =>
    Effect.gen(function* () {
      const baseUrl = yield* setting("ENDERDASH_BASE_URL")
      const apiKey = yield* setting("ENDERDASH_API_KEY")
      const failure = (cause: unknown) =>
        cause instanceof EnderdashError
          ? cause
          : new EnderdashError({
              operation,
              reason: "transport",
              uncertain: submitted,
              message: "Enderdash is unavailable. Try again shortly.",
              cause,
            })
      const response = Effect.scoped(
        Effect.acquireUseRelease(
          Effect.sync(() => new AbortController()),
          (controller) =>
            Effect.gen(function* () {
              yield* Effect.sleep("10 seconds").pipe(
                Effect.andThen(Effect.sync(() => controller.abort())),
                Effect.interruptible,
                Effect.forkScoped
              )
              const result = yield* Effect.tryPromise({
                try: async () => {
                  const result = await fetcher(
                    `${baseUrl.replace(/\/$/, "")}/api/http/servers/${operation}`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-API-Key": apiKey,
                      },
                      body: JSON.stringify(input),
                      signal: controller.signal,
                    }
                  )
                  if (controller.signal.aborted) {
                    await result.body?.cancel().catch(() => undefined)
                    controller.signal.throwIfAborted()
                  }
                  return result
                },
                catch: failure,
              })
              return yield* Effect.acquireUseRelease(
                Effect.sync(() => {
                  const reader = result.body?.getReader()
                  const abort = () => {
                    void reader?.cancel().catch(() => undefined)
                  }
                  controller.signal.addEventListener("abort", abort, {
                    once: true,
                  })
                  return { reader, abort }
                }),
                ({ reader }) =>
                  Effect.gen(function* () {
                    yield* Effect.try({
                      try: () => controller.signal.throwIfAborted(),
                      catch: failure,
                    })
                    if (!result.ok) {
                      const uncertain =
                        submitted &&
                        (result.status >= 500 || result.status === 408)
                      return yield* new EnderdashError({
                        operation,
                        reason: uncertain ? "transport" : "rejected",
                        uncertain,
                        message: uncertain
                          ? "Enderdash could not confirm the command result."
                          : "Enderdash rejected the request.",
                      })
                    }
                    let bytes = 0
                    let text = ""
                    const decoder = new TextDecoder()
                    if (reader)
                      for (;;) {
                        const chunk = yield* Effect.tryPromise({
                          try: () => reader.read(),
                          catch: failure,
                        })
                        yield* Effect.try({
                          try: () => controller.signal.throwIfAborted(),
                          catch: failure,
                        })
                        if (chunk.done) break
                        bytes += chunk.value.byteLength
                        if (bytes > 1024 * 1024)
                          return yield* new EnderdashError({
                            operation,
                            reason: "response",
                            uncertain: submitted,
                            message:
                              "Enderdash returned an oversized response.",
                          })
                        text += decoder.decode(chunk.value, { stream: true })
                      }
                    const body = yield* Effect.try({
                      try: () => JSON.parse(text + decoder.decode()) as unknown,
                      catch: (cause) =>
                        new EnderdashError({
                          operation,
                          reason: "response",
                          uncertain: submitted,
                          message: "Enderdash returned an invalid response.",
                          cause,
                        }),
                    })
                    return yield* Schema.decodeUnknownEffect(schema)(body).pipe(
                      Effect.mapError(
                        (cause) =>
                          new EnderdashError({
                            operation,
                            reason: "response",
                            uncertain: submitted,
                            message: "Enderdash returned an invalid response.",
                            cause,
                          })
                      )
                    )
                  }),
                ({ reader, abort }) =>
                  Effect.promise(async () => {
                    controller.signal.removeEventListener("abort", abort)
                    await reader?.cancel().catch(() => undefined)
                    reader?.releaseLock()
                  })
              )
            }),
          (controller) => Effect.sync(() => controller.abort())
        )
      )
      // Commands may have succeeded despite a lost acknowledgement. Finish the
      // single submitted request before interruption; never retry it here.
      return yield* submitted ? response.pipe(Effect.uninterruptible) : response
    })
  return {
    execute: (input) =>
      request("executeConsoleCommand", input, commandResponseSchema, true).pipe(
        Effect.flatMap((result) =>
          result.success
            ? Effect.succeed(result)
            : Effect.fail(
                new EnderdashError({
                  operation: "executeConsoleCommand",
                  reason: result.commandResult === 2 ? "rejected" : "response",
                  uncertain: result.commandResult !== 2,
                  message:
                    result.error || "Enderdash rejected the console command",
                })
              )
        )
      ),
    resolve: (username) =>
      Effect.gen(function* () {
        const server = yield* target
        const result = yield* request(
          "resolveLuckPermsUsername",
          { ...server, username },
          lookupResponseSchema,
          false
        )
        if (!result.success)
          return yield* new EnderdashError({
            operation: "resolveLuckPermsUsername",
            reason: "rejected",
            message: result.error || "Could not resolve Minecraft username",
          })
        return result.lookup
      }),
    snapshot: (input) =>
      Effect.gen(function* () {
        const server = yield* target
        const result = yield* request(
          "getLuckPermsSnapshot",
          {
            ...server,
            ...(input.uuid
              ? { uuid: input.uuid }
              : { username: input.username }),
          },
          snapshotResponseSchema,
          false
        )
        if (!result.success)
          return yield* new EnderdashError({
            operation: "getLuckPermsSnapshot",
            reason: "rejected",
            message: result.error || "Could not load LuckPerms snapshot",
          })
        return result.result
      }),
  }
}

export const executeEnderdashConsoleCommand = (
  input: ExecuteConsoleCommandInput
) => Effect.flatMap(EnderdashGateway, (gateway) => gateway.execute(input))
export const resolveMinecraftUsername = (username: string) =>
  Effect.flatMap(EnderdashGateway, (gateway) => gateway.resolve(username))
export const getLuckPermsSnapshot = (input: {
  username?: string
  uuid?: string
}) => Effect.flatMap(EnderdashGateway, (gateway) => gateway.snapshot(input))
