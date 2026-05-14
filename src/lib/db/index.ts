import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

export function createDb(databaseUrl = getEnv().DATABASE_URL) {
  const trimmedUrl = typeof databaseUrl === "string" ? databaseUrl.trim() : "";
  if (!trimmedUrl) {
    throw new Error("DATABASE_URL is required to create the database client");
  }

  try {
    return drizzle(neon(trimmedUrl), { schema });
  } catch (error) {
    throw new Error("Failed to create Neon database client from DATABASE_URL", { cause: error });
  }
}

let db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  db ??= createDb();
  return db;
}
