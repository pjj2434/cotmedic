/** Manual tags stored on clientRecord.tags JSON. */
export const MANUAL_CLIENT_TAGS = ["vip", "priority"] as const;
export type ManualClientTag = (typeof MANUAL_CLIENT_TAGS)[number];

/** Tags shown in the UI (manual + derived). */
export type ClientDisplayTag = ManualClientTag | "overdue" | "inactive";

export function parseClientTagsJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  } catch {
    return [];
  }
}

export function serializeClientTags(tags: string[]): string {
  const unique = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  return JSON.stringify(unique);
}

export function getClientDisplayTags(input: {
  paymentStatus: string;
  isActive: boolean;
  tags?: string | null;
}): ClientDisplayTag[] {
  const manual = parseClientTagsJson(input.tags).filter(
    (t): t is ManualClientTag => MANUAL_CLIENT_TAGS.includes(t as ManualClientTag)
  );
  const display: ClientDisplayTag[] = [...manual];
  if (input.paymentStatus === "overdue" && !display.includes("overdue")) {
    display.unshift("overdue");
  }
  if (!input.isActive && !display.includes("inactive")) {
    display.push("inactive");
  }
  return display;
}

export function clientTagLabel(tag: ClientDisplayTag): string {
  switch (tag) {
    case "overdue":
      return "Overdue";
    case "inactive":
      return "Inactive";
    case "vip":
      return "VIP";
    case "priority":
      return "Priority";
    default:
      return tag;
  }
}

export function clientTagClass(tag: ClientDisplayTag): string {
  switch (tag) {
    case "overdue":
      return "bg-red-100 text-red-800 ring-red-200/80";
    case "inactive":
      return "bg-zinc-200 text-zinc-700 ring-zinc-300/80";
    case "vip":
      return "bg-violet-100 text-violet-900 ring-violet-200/80";
    case "priority":
      return "bg-amber-100 text-amber-900 ring-amber-200/80";
    default:
      return "bg-zinc-100 text-zinc-700 ring-zinc-200/80";
  }
}
