import { drizzle } from "drizzle-orm/d1"

import * as schema from "@/lib/server/schema"
import { getD1Database } from "@/lib/server/worker-env"

export function getDb() {
  return drizzle(getD1Database(), { schema })
}
