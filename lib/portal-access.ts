import { eq, inArray, type SQL } from "drizzle-orm";
import { workOrder } from "@/db/schema";

export type SessionUserLike = {
  id: string;
  locationId?: string | null;
  managedLocationIds?: string | null;
};

export function parseManagedLocationIds(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.length > 0);
  } catch {
    return [];
  }
}

export type WorkOrderCustomerScope =
  | { kind: "owner" }
  | { kind: "technician" }
  | { kind: "none" }
  | { kind: "customers"; ids: string[] };

/** Which customer (location) user ids this role may see work orders for. */
export function workOrderCustomerScope(role: string, user: SessionUserLike): WorkOrderCustomerScope {
  if (role === "owner") return { kind: "owner" };
  if (role === "technician") return { kind: "technician" };
  if (role === "client") return { kind: "customers", ids: [user.id] };
  if (role === "employee") {
    const loc = user.locationId?.trim();
    if (!loc) return { kind: "none" };
    return { kind: "customers", ids: [loc] };
  }
  if (role === "administrator") {
    const ids = parseManagedLocationIds(user.managedLocationIds);
    return ids.length ? { kind: "customers", ids } : { kind: "none" };
  }
  return { kind: "none" };
}

export function appendWorkOrderCustomerScopeConditions(
  scope: WorkOrderCustomerScope,
  conditions: SQL[]
): "ok" | "empty" {
  if (scope.kind === "owner" || scope.kind === "technician") return "ok";
  if (scope.kind === "none") return "empty";
  if (scope.ids.length === 0) return "empty";
  if (scope.ids.length === 1) {
    conditions.push(eq(workOrder.customerId, scope.ids[0]));
    return "ok";
  }
  conditions.push(inArray(workOrder.customerId, scope.ids));
  return "ok";
}

export function canViewWorkOrderForPortalUser(
  role: string,
  user: SessionUserLike,
  order: { customerId: string; technicianId: string }
): boolean {
  if (role === "owner") return true;
  if (role === "technician") return order.technicianId === user.id;
  const scope = workOrderCustomerScope(role, user);
  if (scope.kind !== "customers") return false;
  return scope.ids.includes(order.customerId);
}

export function canEditWorkOrderForPortalUser(
  role: string,
  user: SessionUserLike,
  order: { technicianId: string }
): boolean {
  if (role === "owner") return true;
  if (role === "technician") return order.technicianId === user.id;
  return false;
}

/** Owner always; client/employee fixed location; administrator only if location is in their list. */
export function portalUserCanAccessClientFiles(
  role: string,
  user: SessionUserLike,
  clientId: string
): boolean {
  if (role === "owner") return true;
  if (role === "client") return clientId === user.id;
  if (role === "employee") {
    const loc = user.locationId?.trim();
    return !!loc && loc === clientId;
  }
  if (role === "administrator") {
    return parseManagedLocationIds(user.managedLocationIds).includes(clientId);
  }
  return false;
}
