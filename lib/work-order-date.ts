/** Parse repair form date (YYYY-MM-DD or M/D/YYYY) to ISO date string. */
export function parseWorkOrderDateToIso(value: unknown): string {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!us) return "";
  const mm = Number(us[1]);
  const dd = Number(us[2]);
  const yyyy = Number(us[3]);
  const d = new Date(yyyy, mm - 1, dd);
  const valid = d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd;
  if (!valid) return "";
  return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export function parseWorkOrderFormDateTime(formData: string): { dateIso: string; time: string } {
  try {
    const data = JSON.parse(formData) as Record<string, unknown>;
    return {
      dateIso: parseWorkOrderDateToIso(data.date),
      time: typeof data.time === "string" ? data.time.trim() : "",
    };
  } catch {
    return { dateIso: "", time: "" };
  }
}

export function workOrderFormHasDate(formData: unknown): boolean {
  if (!formData || typeof formData !== "object") return false;
  return parseWorkOrderDateToIso((formData as Record<string, unknown>).date).length > 0;
}

/** Format YYYY-MM-DD as a calendar date (avoids UTC off-by-one from `new Date("YYYY-MM-DD")`). */
export function formatCalendarIsoDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString();
}

export function formatWorkOrderDisplayDate(dateIso: string): string {
  return formatCalendarIsoDate(dateIso);
}

export function formatWorkOrderDisplayDateWithFormatter(
  dateIso: string,
  formatter: Intl.DateTimeFormat
): string {
  if (!dateIso) return "—";
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return formatter.format(new Date(y, m - 1, d));
}

/** Format ticket time; falls back to submission timestamp when missing. */
export function formatWorkOrderDisplayTime(
  time: string,
  createdAt: string,
  formatter: Intl.DateTimeFormat
): string {
  const raw = time.trim();
  const twentyFourHour = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    const d = new Date();
    d.setHours(Number(twentyFourHour[1]), Number(twentyFourHour[2]), 0, 0);
    return formatter.format(d);
  }
  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (twelveHour) {
    let hour = Number(twelveHour[1]) % 12;
    if (twelveHour[3].toUpperCase() === "PM") hour += 12;
    const d = new Date();
    d.setHours(hour, Number(twelveHour[2]), 0, 0);
    return formatter.format(d);
  }
  return formatter.format(new Date(createdAt));
}
