import { env } from "cloudflare:workers"

function readEnv(name: keyof typeof env) {
  const value = env[name]
  return typeof value === "string" ? value.trim() : value
}

export function requireStringEnv(name: keyof typeof env) {
  const value = readEnv(name)

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required Worker binding: ${String(name)}`)
  }

  return value
}

export function getOptionalStringEnv(name: keyof typeof env) {
  const value = readEnv(name)
  return typeof value === "string" && value.length > 0 ? value : null
}

export function getD1Database() {
  const bindings: Partial<typeof env> = env
  const database = bindings.DB
  if (!database) {
    throw new Error("Missing required D1 binding: DB")
  }

  return database
}

export { env }
