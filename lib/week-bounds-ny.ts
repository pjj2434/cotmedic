import { startOfWeek, endOfWeek } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

/** Match dashboard display; Monday–Sunday weeks for analytics. */
export const ANALYTICS_TIME_ZONE = "America/New_York";

/** UTC ISO bounds for the calendar week (Mon–Sun) containing `reference` in Eastern Time. */
export function getMondaySundayUtcIsoRange(reference = new Date()) {
  const zonedNow = toZonedTime(reference, ANALYTICS_TIME_ZONE);
  const weekStartLocal = startOfWeek(zonedNow, { weekStartsOn: 1 });
  const weekEndLocal = endOfWeek(zonedNow, { weekStartsOn: 1 });
  const startUtc = fromZonedTime(weekStartLocal, ANALYTICS_TIME_ZONE);
  const endUtc = fromZonedTime(weekEndLocal, ANALYTICS_TIME_ZONE);
  return {
    start: startUtc.toISOString(),
    end: endUtc.toISOString(),
  };
}
