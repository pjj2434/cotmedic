import { ANALYTICS_TIME_ZONE } from "@/lib/week-bounds-ny";

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Format a UTC instant as YYYY-MM-DD on the America/New_York calendar. */
export function formatYmdNY(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Smallest UTC instant whose Eastern calendar date is `ymd` (`YYYY-MM-DD`). */
export function firstUtcInstantNyYmd(ymd: string): Date {
  if (!YMD.test(ymd.trim())) throw new Error("Invalid date (expected YYYY-MM-DD)");
  const [y, mo, d] = ymd.split("-").map(Number);
  let lo = Date.UTC(y, mo - 1, d - 1);
  let hi = Date.UTC(y, mo - 1, d + 2);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const ny = formatYmdNY(new Date(mid));
    if (ny < ymd) lo = mid + 1;
    else hi = mid;
  }
  return new Date(lo);
}

/** Next Eastern calendar date after `ymd` as YYYY-MM-DD. */
export function nextNyYmd(ymd: string): string {
  let t = firstUtcInstantNyYmd(ymd).getTime();
  const cur = ymd;
  while (formatYmdNY(new Date(t)) === cur) {
    t += 3_600_000;
  }
  return formatYmdNY(new Date(t));
}

/** `[startIso, endExclusiveIso)` for DB comparisons (`createdAt` is ISO text). */
export function getNyRangeQueryBounds(fromYmd: string, toYmd: string): {
  startIso: string;
  endExclusiveIso: string;
} {
  const a = fromYmd.trim();
  const b = toYmd.trim();
  if (!YMD.test(a) || !YMD.test(b)) throw new Error("Invalid date (expected YYYY-MM-DD)");
  if (a > b) throw new Error("Start date must be on or before end date");
  return {
    startIso: firstUtcInstantNyYmd(a).toISOString(),
    endExclusiveIso: firstUtcInstantNyYmd(nextNyYmd(b)).toISOString(),
  };
}

/** Month keys `YYYY-MM` from `fromYmd` through `toYmd` (inclusive), in order. */
export function enumerateYmBetween(fromYmd: string, toYmd: string): string[] {
  let ym = fromYmd.trim().slice(0, 7);
  const endYm = toYmd.trim().slice(0, 7);
  const out: string[] = [];
  while (ym <= endYm) {
    out.push(ym);
    ym = incrementYm(ym);
  }
  return out;
}

function incrementYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}
