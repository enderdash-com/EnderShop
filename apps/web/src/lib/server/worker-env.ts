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
  if (!("DB" in env) || !env.DB) {
    throw new Error("Missing required D1 binding: DB")
  }

  return env.DB
}

export { env }
