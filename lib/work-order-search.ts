import { like, or, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { workOrder } from "@/db/schema";

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

/** Match work orders by customer, technician, unit fields, model, make, or notes. */
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
    jsonFormFieldLike("$.description", patternLower)
  )!;
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

  const { serial, ambulance, model, make } = parseWorkOrderFormSearchFields(input.formData);
  if (serial.toLowerCase().includes(needle)) return true;
  if (ambulance.toLowerCase().includes(needle)) return true;
  if (model.toLowerCase().includes(needle)) return true;
  if (make.toLowerCase().includes(needle)) return true;

  try {
    const data = JSON.parse(input.formData) as Record<string, unknown>;
    const extra = [
      data.description,
      data.stairChairModel,
      data.stairChairSN,
      data.lockBarIssue,
    ]
      .map((v) => String(v ?? "").trim().toLowerCase())
      .filter(Boolean);
    if (extra.some((s) => s.includes(needle))) return true;
  } catch {
    /* ignore */
  }

  return false;
}

/** Subtitle for portal search results — surfaces which field matched. */
export function describeWorkOrderSearchMatch(
  q: string,
  input: {
    customerName: string;
    technicianName: string;
    formData: string;
    createdAt: string;
  }
): string {
  const needle = q.trim().toLowerCase();
  if (!needle) return new Date(input.createdAt).toLocaleDateString();

  const { serial, ambulance, model, make } = parseWorkOrderFormSearchFields(input.formData);
  if (model.toLowerCase().includes(needle)) return `Model ${model}`;
  if (make.toLowerCase().includes(needle)) return `Make ${make}`;
  if (serial.toLowerCase().includes(needle)) return `Serial ${serial}`;
  if (ambulance.toLowerCase().includes(needle)) return `Unit ${ambulance}`;
  if (input.technicianName.toLowerCase().includes(needle)) return input.technicianName;
  if (input.customerName.toLowerCase().includes(needle)) return input.customerName;
  return new Date(input.createdAt).toLocaleDateString();
}
