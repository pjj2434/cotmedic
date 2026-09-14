import { NextResponse } from "next/server";
import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/db";
import { checklist, user, workOrder } from "@/db/schema";
import {
  appendWorkOrderCustomerScopeConditions,
  workOrderCustomerScope,
} from "@/lib/portal-access";
import {
  buildEquipmentInventory,
  buildServiceHistory,
} from "@/lib/equipment-reports";
import { parseWorkOrderFormDateTime } from "@/lib/work-order-date";
import { withAuthApi } from "@/lib/with-auth";

function appendChecklistCustomerScope(
  role: string,
  authUser: { id: string; locationId?: string | null; managedLocationIds?: string | null },
  conditions: SQL[]
): "ok" | "empty" {
  const scope = workOrderCustomerScope(role, authUser);
  if (scope.kind === "owner" || scope.kind === "technician") return "ok";
  if (scope.kind === "none" || scope.ids.length === 0) return "empty";
  if (scope.ids.length === 1) {
    conditions.push(eq(checklist.customerId, scope.ids[0]));
    return "ok";
  }
  conditions.push(inArray(checklist.customerId, scope.ids));
  return "ok";
}

/** GET — Equipment inventory + service history for location portal roles. */
export async function GET() {
  const authResult = await withAuthApi({
    roles: ["client", "employee", "administrator"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { user: authUser, role } = authResult;

  const scope = workOrderCustomerScope(role, authUser);
  if (scope.kind !== "customers" || scope.ids.length === 0) {
    return NextResponse.json({ history: [], equipment: [], locations: [] });
  }

  const woConditions: SQL[] = [];
  const woScope = appendWorkOrderCustomerScopeConditions(scope, woConditions);
  if (woScope === "empty") {
    return NextResponse.json({ history: [], equipment: [], locations: [] });
  }

  const clConditions: SQL[] = [];
  const clScope = appendChecklistCustomerScope(role, authUser, clConditions);
  if (clScope === "empty") {
    return NextResponse.json({ history: [], equipment: [], locations: [] });
  }

  const woTech = alias(user, "reportWoTech");
  const woCustomer = alias(user, "reportWoCustomer");
  const clTech = alias(user, "reportClTech");
  const clCustomer = alias(user, "reportClCustomer");

  const [workOrders, checklists, locationRows] = await Promise.all([
    db
      .select({
        id: workOrder.id,
        type: workOrder.type,
        formData: workOrder.formData,
        customerId: workOrder.customerId,
        customerName: woCustomer.name,
        createdAt: workOrder.createdAt,
      })
      .from(workOrder)
      .innerJoin(woTech, eq(workOrder.technicianId, woTech.id))
      .innerJoin(woCustomer, eq(workOrder.customerId, woCustomer.id))
      .where(and(...woConditions))
      .orderBy(desc(workOrder.createdAt)),
    db
      .select({
        id: checklist.id,
        type: checklist.type,
        formData: checklist.formData,
        customerId: checklist.customerId,
        customerName: clCustomer.name,
        createdAt: checklist.createdAt,
      })
      .from(checklist)
      .innerJoin(clTech, eq(checklist.technicianId, clTech.id))
      .innerJoin(clCustomer, eq(checklist.customerId, clCustomer.id))
      .where(and(...clConditions))
      .orderBy(desc(checklist.createdAt)),
    db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(and(eq(user.role, "client"), inArray(user.id, scope.ids))),
  ]);

  const history = buildServiceHistory(
    workOrders.map((o) => {
      const { dateIso } = parseWorkOrderFormDateTime(o.formData);
      return {
        id: o.id,
        type: o.type,
        formData: o.formData,
        customerId: o.customerId,
        customerName: o.customerName ?? "—",
        createdAt: o.createdAt,
        workDateIso: dateIso,
      };
    }),
    checklists.map((c) => ({
      id: c.id,
      type: c.type,
      formData: c.formData,
      customerId: c.customerId,
      customerName: c.customerName ?? "—",
      createdAt: c.createdAt,
    }))
  );

  const equipment = buildEquipmentInventory(history);
  const locations = locationRows
    .map((l) => ({ id: l.id, name: (l.name ?? "").trim() || "—" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ history, equipment, locations });
}
