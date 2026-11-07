import { TestClock } from "effect/testing"
import assert from "node:assert/strict"
import { test } from "node:test"
import { Effect, Exit, Fiber, Layer, Result } from "effect"
import { EnderdashGateway, makeEnderdashGateway } from "./enderdash"
import { ShopConfigurationError, ShopSettings } from "./shop-services"
import { runFulfillmentCommands } from "./fulfillment"

const settings = Layer.succeed(ShopSettings, {
  require: (name: string) =>
    name === "ENDERDASH_BASE_URL"
      ? Effect.succeed("https://dashboard.example/")
      : Effect.succeed(`value-${name}`),
})
const command = {
  organizationId: "org",
  serverId: "server",
  command: "lp user uuid parent set prime",
}
const envelope = {
  requestId: "request",
  serverId: "server",
  success: true,
  error: null,
}
const executeResult = {
  ...envelope,
  command: command.command,
  commandResult: 1,
}

const run = <A, E>(program: Effect.Effect<A, E, ShopSettings>) =>
  Effect.runPromise(program.pipe(Effect.provide(settings)))

test("Enderdash uses the supported HTTP endpoints, credentials and plain JSON bodies", async () => {
  const requests: { url: string; init: RequestInit }[] = []
  const gateway = makeEnderdashGateway(async (url, init) => {
    requests.push({ url, init })
    if (url.endsWith("executeConsoleCommand"))
      return Response.json(executeResult)
    if (url.endsWith("resolveLuckPermsUsername"))
      return Response.json({
        ...envelope,
        lookup: { found: true, username: "Player", uuid: "uuid", groups: [] },
      })
    return Response.json({
      ...envelope,
      result: {
        found: true,
        user: {
          uuid: "uuid",
          primary_group: "prime",
          groups: [{ name: "prime", nodes: [{ key: "extra" }] }],
          nodes: [],
        },
      },
    })
  })
  assert.equal((await run(gateway.execute(command))).commandResult, 1)
  assert.equal((await run(gateway.resolve("Player")))?.username, "Player")
  assert.deepEqual(
    (await run(gateway.snapshot({ uuid: "uuid" })))?.user?.groups,
    [{ name: "prime" }]
  )
  assert.deepEqual(
    requests.map((request) => request.url),
    [
      "https://dashboard.example/api/http/servers/executeConsoleCommand",
      "https://dashboard.example/api/http/servers/resolveLuckPermsUsername",
      "https://dashboard.example/api/http/servers/getLuckPermsSnapshot",
    ]
  )
  assert.deepEqual(
    requests.map((request) => JSON.parse(String(request.init.body))),
    [
      command,
      {
        organizationId: "value-ENDERDASH_ORGANIZATION_ID",
        serverId: "value-ENDERDASH_SERVER_ID",
        username: "Player",
      },
      {
        organizationId: "value-ENDERDASH_ORGANIZATION_ID",
        serverId: "value-ENDERDASH_SERVER_ID",
        uuid: "uuid",
      },
    ]
  )
  for (const { init } of requests) {
    assert.equal(init.method, "POST")
    assert.equal(
      new Headers(init.headers).get("X-API-Key"),
      "value-ENDERDASH_API_KEY"
    )
    assert.equal(
      new Headers(init.headers).get("Content-Type"),
      "application/json"
    )
  }
})

test("a lost command acknowledgement is classified as uncertain and never retried", async () => {
  let attempts = 0
  const gateway = makeEnderdashGateway(async () => {
    attempts++
    throw new Error("lost connection")
  })
  const outcome = await run(Effect.result(gateway.execute(command)))
  assert.equal(attempts, 1)
  assert(Result.isFailure(outcome))
  assert.equal(outcome.failure._tag, "EnderdashError")
  if (outcome.failure._tag === "EnderdashError")
    assert.equal(outcome.failure.uncertain, true)
})

test("explicit command rejection and invalid response shape remain different failures", async () => {
  const rejected = makeEnderdashGateway(async () =>
    Response.json({
      ...executeResult,
      success: false,
      error: "Server offline",
      commandResult: 2,
    })
  )
  await assert.rejects(run(rejected.execute(command)), {
    reason: "rejected",
    uncertain: false,
    message: "Server offline",
  })
  const invalid = makeEnderdashGateway(async () =>
    Response.json({ ...executeResult, commandResult: "wrong" })
  )
  await assert.rejects(run(invalid.execute(command)), {
    reason: "response",
    uncertain: true,
    message: "Enderdash returned an invalid response.",
  })
})

test("HTTP failures close the response body and preserve uncertain command outcomes", async () => {
  let closed = false
  const gateway = makeEnderdashGateway(
    async () =>
      new Response(
        new ReadableStream({
          cancel() {
            closed = true
          },
        }),
        { status: 503 }
      )
  )
  await assert.rejects(run(gateway.execute(command)), {
    reason: "transport",
    uncertain: true,
  })
  assert.equal(closed, true)
})

test("cancelling a read closes its body before the operation settles", async () => {
  let reading!: () => void
  const started = new Promise<void>((resolve) => {
    reading = resolve
  })
  let closed = false
  const gateway = makeEnderdashGateway(
    async () =>
      new Response(
        new ReadableStream(
          {
            pull() {
              reading()
            },
            async cancel() {
              await Promise.resolve()
              closed = true
            },
          },
          { highWaterMark: 0 }
        )
      )
  )
  const controller = new AbortController()
  const result = Effect.runPromiseExit(
    gateway.resolve("Player").pipe(Effect.provide(settings)),
    { signal: controller.signal }
  )
  await started
  controller.abort()
  assert.equal(Exit.isFailure(await result), true)
  assert.equal(closed, true)
})

test("oversized responses are rejected and close their reader", async () => {
  let closed = false
  const gateway = makeEnderdashGateway(
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(1024 * 1024 + 1))
          },
          cancel() {
            closed = true
          },
        })
      )
  )
  await assert.rejects(run(gateway.snapshot({ uuid: "uuid" })), {
    reason: "response",
    message: "Enderdash returned an oversized response.",
  })
  assert.equal(closed, true)
})

test("sequential command failure records completed commands without submitting later commands", async () => {
  const commands: string[] = []
  const gateway = makeEnderdashGateway(async (_url, init) => {
    const input = JSON.parse(String(init.body))
    commands.push(input.command)
    return Response.json({
      ...executeResult,
      command: input.command,
      success: commands.length !== 2,
      error: commands.length === 2 ? "rejected" : null,
    })
  })
  await assert.rejects(
    Effect.runPromise(
      runFulfillmentCommands({
        commands: ["first {{uuid}}", "second", "third"],
        target: { uuid: "uuid", username: "Player" },
      }).pipe(
        Effect.provide(settings),
        Effect.provideService(EnderdashGateway, gateway)
      )
    ),
    {
      completedCommands: 1,
      commandIndex: 1,
      message:
        "Fulfillment failed after 1 completed commands. The failed command may require reconciliation.",
    }
  )
  assert.deepEqual(commands, ["first uuid", "second"])
})

test("configuration failures occur before contacting Enderdash", async () => {
  let contacted = false
  const gateway = makeEnderdashGateway(async () => {
    contacted = true
    return Response.json(executeResult)
  })
  const result = gateway.execute(command).pipe(
    Effect.provideService(ShopSettings, {
      require: (binding) =>
        Effect.fail(
          new ShopConfigurationError({ binding, cause: new Error("missing") })
        ),
    })
  )
  await assert.rejects(Effect.runPromise(result), {
    binding: "ENDERDASH_BASE_URL",
  })
  assert.equal(contacted, false)
})

test("interruption waits for response-body cleanup", async () => {
  let reading!: () => void
  let close!: () => void
  let cancel!: () => void
  const started = new Promise<void>((resolve) => {
    reading = resolve
  })
  const cancelling = new Promise<void>((resolve) => {
    cancel = resolve
  })
  const closed = new Promise<void>((resolve) => {
    close = resolve
  })
  const gateway = makeEnderdashGateway(
    async () =>
      new Response(
        new ReadableStream(
          {
            pull() {
              reading()
            },
            cancel() {
              cancel()
              return closed
            },
          },
          { highWaterMark: 0 }
        )
      )
  )
  const controller = new AbortController()
  let settled = false
  const result = Effect.runPromiseExit(
    gateway.resolve("Player").pipe(Effect.provide(settings)),
    { signal: controller.signal }
  ).then((exit) => {
    settled = true
    return exit
  })
  await started
  controller.abort()
  await cancelling
  assert.equal(settled, false)
  close()
  await result
})

test("a late response after read cancellation is discarded and closed", async () => {
  let start!: () => void
  let finish!: (response: Response) => void
  const started = new Promise<void>((resolve) => {
    start = resolve
  })
  const pending = new Promise<Response>((resolve) => {
    finish = resolve
  })
  const gateway = makeEnderdashGateway(() => {
    start()
    return pending
  })
  const controller = new AbortController()
  const result = Effect.runPromiseExit(
    gateway.resolve("Player").pipe(Effect.provide(settings)),
    { signal: controller.signal }
  )
  await started
  controller.abort()
  await result
  let close!: () => void
  const closed = new Promise<void>((resolve) => {
    close = resolve
  })
  finish(
    new Response(
      new ReadableStream({
        cancel() {
          close()
        },
      })
    )
  )
  await closed
})

test("concurrent programs keep their Enderdash credentials and targets isolated", async () => {
  const received: { key: string | null; organizationId: string }[] = []
  const gateway = makeEnderdashGateway(async (_url, init) => {
    received.push({
      key: new Headers(init.headers).get("X-API-Key"),
      organizationId: JSON.parse(String(init.body)).organizationId,
    })
    return Response.json({ ...envelope, lookup: null })
  })
  await Promise.all(
    ["first", "second"].map((request) =>
      Effect.runPromise(
        gateway.resolve("Player").pipe(
          Effect.provideService(ShopSettings, {
            require: (binding) =>
              Effect.succeed(
                binding === "ENDERDASH_BASE_URL"
                  ? "https://dashboard.example"
                  : `${request}:${binding}`
              ),
          })
        )
      )
    )
  )
  assert.deepEqual(
    received.sort((left, right) =>
      String(left.key).localeCompare(String(right.key))
    ),
    [
      {
        key: "first:ENDERDASH_API_KEY",
        organizationId: "first:ENDERDASH_ORGANIZATION_ID",
      },
      {
        key: "second:ENDERDASH_API_KEY",
        organizationId: "second:ENDERDASH_ORGANIZATION_ID",
      },
    ]
  )
})

for (const phase of ["headers", "body"]) {
  test(`the complete command deadline includes pending ${phase} without retrying`, async () => {
    let start!: () => void
    const started = new Promise<void>((resolve) => {
      start = resolve
    })
    let requests = 0
    let aborted = false
    let bodyClosed = false
    const gateway = makeEnderdashGateway(async (_url, init) => {
      requests++
      if (phase === "headers")
        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener(
            "abort",
            () => {
              aborted = true
              reject(new Error("deadline"))
            },
            { once: true }
          )
          start()
        })
      return new Response(
        new ReadableStream(
          {
            pull() {
              start()
            },
            cancel() {
              aborted = init.signal?.aborted === true
              bodyClosed = true
            },
          },
          { highWaterMark: 0 }
        )
      )
    })
    const program = Effect.gen(function* () {
      const fiber = yield* gateway
        .execute(command)
        .pipe(Effect.result, Effect.forkChild)
      yield* Effect.promise(() => started)
      yield* TestClock.adjust("9 seconds")
      assert.equal(aborted, false)
      yield* TestClock.adjust("1 second")
      const outcome = yield* Fiber.join(fiber)
      assert(Result.isFailure(outcome))
      assert.equal(outcome.failure._tag, "EnderdashError")
      if (outcome.failure._tag === "EnderdashError") {
        assert.equal(outcome.failure.reason, "transport")
        assert.equal(outcome.failure.uncertain, true)
      }
    })
    await Effect.runPromise(
      program.pipe(Effect.provide(settings), Effect.provide(TestClock.layer()))
    )
    assert.equal(requests, 1)
    assert.equal(aborted, true)
    if (phase === "body") assert.equal(bodyClosed, true)
  })
}
