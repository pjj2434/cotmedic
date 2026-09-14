import { formatCalendarIsoDate, parseWorkOrderDateToIso } from "@/lib/work-order-date";
import { parseWorkOrderFormSearchFields } from "@/lib/work-order-search";

export type EquipmentHistoryRow = {
  id: string;
  source: "work_order" | "checklist";
  brand: "cot" | "lift";
  dateIso: string;
  dateLabel: string;
  locationId: string;
  locationName: string;
  serial: string;
  /** Ambulance (cot) or bus (lift) unit identifier. */
  unit: string;
  createdAt: string;
};

export type EquipmentInventoryRow = {
  id: string;
  locationId: string;
  locationName: string;
  serial: string;
  unit: string;
  brand: "cot" | "lift" | "";
  lastServiceIso: string;
  lastServiceLabel: string;
  serviceCount: number;
};

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase();
}

export function equipmentDedupeKey(row: {
  locationId: string;
  serial: string;
  unit: string;
}): string {
  return [
    row.locationId,
    normalizeKeyPart(row.serial) || "—",
    normalizeKeyPart(row.unit) || "—",
  ].join("|");
}

export function rowFromWorkOrder(input: {
  id: string;
  type: string;
  formData: string;
  customerId: string;
  customerName: string;
  createdAt: string;
  workDateIso?: string;
}): EquipmentHistoryRow {
  const fields = parseWorkOrderFormSearchFields(input.formData);
  let dateIso = input.workDateIso?.trim() || "";
  if (!dateIso) {
    try {
      const data = JSON.parse(input.formData) as Record<string, unknown>;
      dateIso = parseWorkOrderDateToIso(data.date);
    } catch {
      dateIso = "";
    }
  }
  return {
    id: `wo:${input.id}`,
    source: "work_order",
    brand: input.type === "lift" ? "lift" : "cot",
    dateIso,
    dateLabel: dateIso ? formatCalendarIsoDate(dateIso) : "—",
    locationId: input.customerId,
    locationName: input.customerName?.trim() || "—",
    serial: fields.serial,
    unit: fields.ambulance,
    createdAt: input.createdAt,
  };
}

export function rowFromChecklist(input: {
  id: string;
  type: string;
  formData: string;
  customerId: string;
  customerName: string;
  createdAt: string;
  workDateIso?: string;
}): EquipmentHistoryRow {
  let serial = "";
  let dateIso = input.workDateIso?.trim() || "";
  try {
    const data = JSON.parse(input.formData) as Record<string, unknown>;
    serial = typeof data.serialNumber === "string" ? data.serialNumber.trim() : "";
    if (!dateIso) dateIso = parseWorkOrderDateToIso(data.dateOfService);
  } catch {
    /* ignore */
  }
  return {
    id: `cl:${input.id}`,
    source: "checklist",
    brand: input.type === "lift" ? "lift" : "cot",
    dateIso,
    dateLabel: dateIso ? formatCalendarIsoDate(dateIso) : "—",
    locationId: input.customerId,
    locationName: input.customerName?.trim() || "—",
    serial,
    unit: "",
    createdAt: input.createdAt,
  };
}

function compareHistoryDesc(a: EquipmentHistoryRow, b: EquipmentHistoryRow): number {
  const dateCmp = (b.dateIso || "").localeCompare(a.dateIso || "");
  if (dateCmp !== 0) return dateCmp;
  return (b.createdAt || "").localeCompare(a.createdAt || "");
}

/** Full service history: every work order + checklist event, newest first. */
export function buildServiceHistory(
  workOrders: Parameters<typeof rowFromWorkOrder>[0][],
  checklists: Parameters<typeof rowFromChecklist>[0][]
): EquipmentHistoryRow[] {
  return [
    ...workOrders.map(rowFromWorkOrder),
    ...checklists.map(rowFromChecklist),
  ].sort(compareHistoryDesc);
}

/**
 * Unique equipment roster: collapses duplicate serial/unit at a location.
 * Drops rows with neither serial nor unit. Keeps latest service date.
 */
export function buildEquipmentInventory(history: EquipmentHistoryRow[]): EquipmentInventoryRow[] {
  const map = new Map<string, EquipmentInventoryRow>();

  for (const row of history) {
    if (!row.serial.trim() && !row.unit.trim()) continue;
    const key = equipmentDedupeKey(row);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        id: key,
        locationId: row.locationId,
        locationName: row.locationName,
        serial: row.serial,
        unit: row.unit,
        brand: row.brand,
        lastServiceIso: row.dateIso,
        lastServiceLabel: row.dateLabel,
        serviceCount: 1,
      });
      continue;
    }
    existing.serviceCount += 1;
    if (!existing.serial.trim() && row.serial.trim()) existing.serial = row.serial;
    if (!existing.unit.trim() && row.unit.trim()) existing.unit = row.unit;
    const newer =
      (row.dateIso || "").localeCompare(existing.lastServiceIso || "") > 0 ||
      (!existing.lastServiceIso && !!row.dateIso);
    if (newer) {
      existing.lastServiceIso = row.dateIso;
      existing.lastServiceLabel = row.dateLabel;
      existing.brand = row.brand;
    }
  }

  return [...map.values()].sort((a, b) => {
    const loc = a.locationName.localeCompare(b.locationName);
    if (loc !== 0) return loc;
    const serial = a.serial.localeCompare(b.serial);
    if (serial !== 0) return serial;
    return a.unit.localeCompare(b.unit);
  });
}
