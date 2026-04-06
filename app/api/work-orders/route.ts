import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { workOrder, user, workOrderFile } from "@/db/schema";
import { eq, and, desc, inArray, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  appendWorkOrderCustomerScopeConditions,
  workOrderCustomerScope,
} from "@/lib/portal-access";

export type WorkOrderType = "cot" | "lift";

/** GET - List work orders. Owner sees all, technician sees own, location portal roles see scoped customers. */
export async function GET(request: Request) {
  const authResult = await withAuthApi({
    roles: ["owner", "technician", "client", "employee", "administrator"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { user: authUser, role } = authResult;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") as WorkOrderType | null;
  const customerId = searchParams.get("customerId");
  const technicianId = searchParams.get("technicianId");

  const conditions: SQL[] = [];
  if (id) conditions.push(eq(workOrder.id, id));
  if (role === "technician") conditions.push(eq(workOrder.technicianId, authUser.id));
  if (role === "client" || role === "employee" || role === "administrator") {
    const scope = workOrderCustomerScope(role, authUser);
    const scopeResult = appendWorkOrderCustomerScopeConditions(scope, conditions);
    if (scopeResult === "empty") {
      if (id) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ workOrders: [] });
    }
  }
  if (type) conditions.push(eq(workOrder.type, type));
  if (customerId && role !== "client" && role !== "employee")
    conditions.push(eq(workOrder.customerId, customerId));
  if (technicianId && role === "owner") conditions.push(eq(workOrder.technicianId, technicianId));

  const orders = await db
    .select()
    .from(workOrder)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(workOrder.createdAt));

  const ordersWithNames = await Promise.all(
    orders.map(async (o) => {
      const [tech, cust] = await Promise.all([
        db.select({ name: user.name }).from(user).where(eq(user.id, o.technicianId)).limit(1),
        db.select({ name: user.name }).from(user).where(eq(user.id, o.customerId)).limit(1),
      ]);
      return {
        ...o,
        technicianName: tech[0]?.name ?? "—",
        customerName: cust[0]?.name ?? "—",
      };
    })
  );

  const orderIds = ordersWithNames.map((o) => o.id);
  const fileRows = orderIds.length
    ? await db
        .selectDistinct({ workOrderId: workOrderFile.workOrderId })
        .from(workOrderFile)
        .where(inArray(workOrderFile.workOrderId, orderIds))
    : [];
  const ordersWithFiles = new Set(fileRows.map((f) => f.workOrderId));
  const ordersWithMeta = ordersWithNames.map((o) => ({
    ...o,
    hasFiles: ordersWithFiles.has(o.id),
  }));

  if (id) {
    const single = ordersWithMeta[0];
    if (!single) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(single);
  }
  return NextResponse.json({ workOrders: ordersWithMeta });
}

/** POST - Create work order. Technician can create own; owner can create on behalf of a technician. */
export async function POST(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner", "technician"] });
  if (authResult instanceof NextResponse) return authResult;
  const { user: authUser, role } = authResult;

  let body: { type: WorkOrderType; customerId: string; formData: unknown; technicianId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, customerId, formData, technicianId } = body;
  if (!type || !customerId || formData == null) {
    return NextResponse.json(
      { error: "type, customerId, and formData are required" },
      { status: 400 }
    );
  }
  if (type !== "cot" && type !== "lift") {
    return NextResponse.json({ error: "type must be cot or lift" }, { status: 400 });
  }

  let assignedTechnicianId = authUser.id;
  if (role === "owner") {
    const requested = String(technicianId ?? "").trim();
    if (!requested) {
      return NextResponse.json({ error: "technicianId is required for owner submissions" }, { status: 400 });
    }
    const tech = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.id, requested), eq(user.role, "technician")))
      .limit(1);
    if (!tech[0]) {
      return NextResponse.json({ error: "Invalid technicianId" }, { status: 400 });
    }
    assignedTechnicianId = requested;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(workOrder).values({
    id,
    technicianId: assignedTechnicianId,
    customerId,
    type,
    formData: JSON.stringify(formData),
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id, success: true });
}
