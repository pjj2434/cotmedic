import { drizzle } from "drizzle-orm/libsql";

// Turso when URL is set; fallback to local file for build/dev
const url =
  process.env.TURSO_DATABASE_URL?.trim() || "file:./data/local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = drizzle({
  connection: authToken
    ? { url, authToken }
    : { url },
});
