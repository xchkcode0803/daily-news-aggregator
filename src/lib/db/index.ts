import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

export function createDb(databaseUrl = getEnv().DATABASE_URL) {
  return drizzle(neon(databaseUrl), { schema });
}

let db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  db ??= createDb();
  return db;
}
