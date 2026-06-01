import { like, or, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { workOrder } from "@/db/schema";
import { formatWorkOrderDisplayDate, parseWorkOrderDateToIso } from "@/lib/work-order-date";

export const WORK_ORDER_SEARCH_QUERY_PARAM = "q";

export type WorkOrderFormSearchFields = {
  serial: string;
  /** Cot: ambulance / unit ID. Lift: bus ID. */
  ambulance: string;
  model: string;
  make: string;
};

/** Parsed unit identifiers from stored repair form JSON. */
export function parseWorkOrderFormSearchFields(formData: string): WorkOrderFormSearchFields {
  try {
    const data = JSON.parse(formData) as Record<string, unknown>;
    return {
      serial: String(data.sn ?? "").trim(),
      ambulance: String(data.ambulance ?? data.bus ?? "").trim(),
      model: String(data.model ?? "").trim(),
      make: String(data.make ?? "").trim(),
    };
  } catch {
    return { serial: "", ambulance: "", model: "", make: "" };
  }
}

function jsonFormFieldLike(jsonPath: string, patternLower: string): SQL {
  return like(
    sql`lower(coalesce(json_extract(${workOrder.formData}, ${jsonPath}), ''))`,
    patternLower
  );
}

/** SQL match on work-order form fields plus location and technician names. */
export function workOrderPortalSearchConditions(
  pattern: string,
  customerName: SQLiteColumn,
  technicianName: SQLiteColumn
): SQL {
  const patternLower = pattern.toLowerCase();
  return or(
    like(sql`lower(coalesce(${customerName}, ''))`, patternLower),
    like(sql`lower(coalesce(${technicianName}, ''))`, patternLower),
    jsonFormFieldLike("$.sn", patternLower),
    jsonFormFieldLike("$.ambulance", patternLower),
    jsonFormFieldLike("$.bus", patternLower),
    jsonFormFieldLike("$.model", patternLower),
    jsonFormFieldLike("$.make", patternLower),
    jsonFormFieldLike("$.description", patternLower),
    jsonFormFieldLike("$.companyName", patternLower),
    jsonFormFieldLike("$.techName", patternLower),
    jsonFormFieldLike("$.stairChairModel", patternLower),
    jsonFormFieldLike("$.stairChairSN", patternLower),
    jsonFormFieldLike("$.stairChairPartsNeeded", patternLower),
    jsonFormFieldLike("$.lockBarIssue", patternLower),
    jsonFormFieldLike("$.date", patternLower),
    jsonFormFieldLike("$.time", patternLower),
    like(sql`lower(coalesce(${workOrder.formData}, ''))`, patternLower)
  )!;
}

function listFieldHaystack(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

/** Searchable text from stored repair form JSON (all ticket fields). */
export function workOrderFormSearchHaystack(formData: string): string {
  try {
    const data = JSON.parse(formData) as Record<string, unknown>;
    const parts = [
      data.sn,
      data.ambulance,
      data.bus,
      data.model,
      data.make,
      data.description,
      data.companyName,
      data.techName,
      data.date,
      data.time,
      data.stairChairModel,
      data.stairChairSN,
      data.stairChairPartsNeeded,
      data.lockBarIssue,
      listFieldHaystack(data.partsUsed),
      listFieldHaystack(data.partsNeeded),
      listFieldHaystack(data.stairChairParts),
    ];
    return parts
      .map((v) => String(v ?? "").trim())
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  } catch {
    return "";
  }
}

/** Client-side contains check (work orders list `?q=` filter). */
export function workOrderMatchesSearchQuery(
  input: {
    customerName: string;
    technicianName: string;
    formData: string;
  },
  q: string
): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;

  if (input.customerName.toLowerCase().includes(needle)) return true;
  if (input.technicianName.toLowerCase().includes(needle)) return true;

  const haystack = workOrderFormSearchHaystack(input.formData);
  if (haystack.includes(needle)) return true;

  return false;
}

/** Subtitle for portal search results — surfaces which field matched. */
export function describeWorkOrderSearchMatch(
  q: string,
  input: {
    customerName: string;
    technicianName: string;
    formData: string;
    workDateIso?: string;
  }
): string {
  const needle = q.trim().toLowerCase();
  if (!needle) {
    return formatWorkOrderDisplayDate(input.workDateIso ?? "");
  }

  const { serial, ambulance, model, make } = parseWorkOrderFormSearchFields(input.formData);
  if (model.toLowerCase().includes(needle)) return `Model ${model}`;
  if (make.toLowerCase().includes(needle)) return `Make ${make}`;
  if (serial.toLowerCase().includes(needle)) return `Serial ${serial}`;
  if (ambulance.toLowerCase().includes(needle)) return `Unit ${ambulance}`;
  if (input.technicianName.toLowerCase().includes(needle)) return input.technicianName;
  if (input.customerName.toLowerCase().includes(needle)) return input.customerName;

  try {
    const data = JSON.parse(input.formData) as Record<string, unknown>;
    if (String(data.description ?? "").toLowerCase().includes(needle)) return "Matched in notes";
    const partsHay = `${listFieldHaystack(data.partsUsed)} ${listFieldHaystack(data.partsNeeded)}`.toLowerCase();
    if (partsHay.includes(needle)) return "Matched in parts";
  } catch {
    /* ignore */
  }

  let dateIso = input.workDateIso ?? "";
  if (!dateIso) {
    try {
      dateIso = parseWorkOrderDateToIso(
        (JSON.parse(input.formData) as Record<string, unknown>).date
      );
    } catch {
      /* ignore */
    }
  }
  return formatWorkOrderDisplayDate(dateIso);
}
