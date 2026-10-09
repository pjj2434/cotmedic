import { like, or, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { checklist } from "@/db/schema";
import { formatCalendarIsoDate, parseWorkOrderDateToIso } from "@/lib/work-order-date";

export const CHECKLIST_SEARCH_QUERY_PARAM = "q";

function jsonFormFieldLike(jsonPath: string, patternLower: string): SQL {
  return like(
    sql`lower(coalesce(json_extract(${checklist.formData}, ${jsonPath}), ''))`,
    patternLower
  );
}

/** SQL match on checklist form fields plus location and technician names. */
export function checklistPortalSearchConditions(
  pattern: string,
  customerName: SQLiteColumn,
  technicianName: SQLiteColumn
): SQL {
  const patternLower = pattern.toLowerCase();
  return or(
    like(sql`lower(coalesce(${customerName}, ''))`, patternLower),
    like(sql`lower(coalesce(${technicianName}, ''))`, patternLower),
    jsonFormFieldLike("$.serialNumber", patternLower),
    jsonFormFieldLike("$.equipmentType", patternLower),
    jsonFormFieldLike("$.productName", patternLower),
    jsonFormFieldLike("$.modelNumber", patternLower),
    jsonFormFieldLike("$.workOrderType", patternLower),
    jsonFormFieldLike("$.problemDescription", patternLower),
    jsonFormFieldLike("$.repairNotes", patternLower),
    jsonFormFieldLike("$.technicianName", patternLower),
    jsonFormFieldLike("$.dateOfService", patternLower),
    like(sql`lower(coalesce(${checklist.formData}, ''))`, patternLower)
  )!;
}

function equipmentLabel(value: unknown): string {
  if (value === "lift") return "Lift";
  if (value === "stretcher") return "Stretcher";
  return "";
}

/** Subtitle for portal search results — surfaces which field matched. */
export function describeChecklistSearchMatch(
  q: string,
  input: {
    customerName: string;
    technicianName: string;
    formData: string;
    workDateIso?: string;
  }
): string {
  const needle = q.trim().toLowerCase();
  let serial = "";
  let equipmentType = "";
  let productName = "";
  let modelNumber = "";
  let dateIso = input.workDateIso ?? "";

  try {
    const data = JSON.parse(input.formData) as Record<string, unknown>;
    serial = String(data.serialNumber ?? "").trim();
    equipmentType = String(data.equipmentType ?? "").trim();
    productName = String(data.productName ?? "").trim();
    modelNumber = String(data.modelNumber ?? "").trim();
    if (!dateIso) {
      dateIso = parseWorkOrderDateToIso(data.dateOfService);
    }
  } catch {
    /* ignore */
  }

  if (!needle) {
    return dateIso ? formatCalendarIsoDate(dateIso) : "Checklist";
  }

  if (serial.toLowerCase().includes(needle)) return `Serial ${serial}`;
  if (equipmentType.toLowerCase().includes(needle)) {
    return equipmentLabel(equipmentType) || equipmentType;
  }
  if (productName.toLowerCase().includes(needle)) return `Product ${productName}`;
  if (modelNumber.toLowerCase().includes(needle)) return `Model ${modelNumber}`;
  if (input.technicianName.toLowerCase().includes(needle)) return input.technicianName;
  if (input.customerName.toLowerCase().includes(needle)) return input.customerName;
  if (dateIso) {
    const dateLabel = formatCalendarIsoDate(dateIso).toLowerCase();
    if (dateIso.includes(needle) || dateLabel.includes(needle)) {
      return formatCalendarIsoDate(dateIso);
    }
  }

  try {
    const data = JSON.parse(input.formData) as Record<string, unknown>;
    if (String(data.problemDescription ?? "").toLowerCase().includes(needle)) {
      return "Matched in problem description";
    }
    if (String(data.repairNotes ?? "").toLowerCase().includes(needle)) {
      return "Matched in notes";
    }
  } catch {
    /* ignore */
  }

  const bits = [
    equipmentLabel(equipmentType),
    serial ? `Serial ${serial}` : "",
    dateIso ? formatCalendarIsoDate(dateIso) : "",
  ].filter(Boolean);
  return bits.join(" · ") || "Checklist";
}
