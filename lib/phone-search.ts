import { like, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

/** Strip formatting characters; keep digits only. */
export function extractPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Match phone values regardless of (), spaces, dashes, dots, or + prefix. */
export function phoneDigitsLike(
  column: SQLiteColumn,
  digits: string
): SQL | undefined {
  if (digits.length < 3) return undefined;

  const normalized = sql`replace(replace(replace(replace(replace(replace(coalesce(${column}, ''), '(', ''), ')', ''), '-', ''), ' ', ''), '.', ''), '+', '')`;
  return like(normalized, `%${digits}%`);
}
