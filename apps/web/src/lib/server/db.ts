import { drizzle } from "drizzle-orm/d1"
import { getD1Database } from "@/lib/server/worker-env"
import * as schema from "@/lib/server/schema"

export function getDb() {
  return drizzle(getD1Database(), { schema })
}
