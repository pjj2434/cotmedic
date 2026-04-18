import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { workOrder, user, workOrderFile } from "@/db/schema";
import { eq, and, desc, inArray, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { utapi } from "@/lib/uploadthing-server";
import {
  appendWorkOrderCustomerScopeConditions,
  canEditWorkOrderForPortalUser,
  workOrderCustomerScope,
} from "@/lib/portal-access";

export type WorkOrderType = "cot" | "lift";

function customerMatchesWorkType(customerType: string | null, workType: WorkOrderType): boolean {
  const normalized = String(customerType ?? "cot").trim().toLowerCase();
  if (!normalized) return workType === "cot";
  if (normalized === "both") return true;
  const types = normalized
    .split(/[,\s|/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return types.includes(workType);
}

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

/** PATCH - Update work order form data and/or customer. Owner can edit any; technician can edit their own. */
export async function PATCH(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner", "technician"] });
  if (authResult instanceof NextResponse) return authResult;
  const { user: authUser, role } = authResult;

  let body: { id: string; formData?: unknown; customerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  const updateForm = body.formData !== undefined && body.formData !== null;
  const newCustomerId = String(body.customerId ?? "").trim();
  const updateCustomer = newCustomerId.length > 0;

  if (!id || (!updateForm && !updateCustomer)) {
    return NextResponse.json(
      { error: "id is required, and formData and/or customerId must be provided" },
      { status: 400 }
    );
  }

  const existing = await db
    .select({
      id: workOrder.id,
      technicianId: workOrder.technicianId,
      type: workOrder.type,
      customerId: workOrder.customerId,
    })
    .from(workOrder)
    .where(eq(workOrder.id, id))
    .limit(1);
  const order = existing[0];
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canEditWorkOrderForPortalUser(role, authUser, { technicianId: order.technicianId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.type !== "cot" && order.type !== "lift") {
    return NextResponse.json({ error: "Invalid work order type" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const setPayload: { formData?: string; customerId?: string; updatedAt: string } = {
    updatedAt: now,
  };

  if (updateForm) {
    setPayload.formData = JSON.stringify(body.formData);
  }

  if (updateCustomer) {
    if (newCustomerId === order.customerId) {
      if (!updateForm) {
        return NextResponse.json({ success: true });
      }
    } else {
      const [cust] = await db
        .select({ id: user.id, customerType: user.customerType })
        .from(user)
        .where(and(eq(user.id, newCustomerId), eq(user.role, "client")))
        .limit(1);
      if (!cust || !customerMatchesWorkType(cust.customerType, order.type)) {
        return NextResponse.json({ error: "Invalid customer for this work order type" }, { status: 400 });
      }
      setPayload.customerId = newCustomerId;
      await db
        .update(workOrderFile)
        .set({ customerId: newCustomerId })
        .where(eq(workOrderFile.workOrderId, id));
    }
  }

  await db.update(workOrder).set(setPayload).where(eq(workOrder.id, id));

  return NextResponse.json({ success: true });
}

/** DELETE - Remove work order and its files from storage. Owners only. */
export async function DELETE(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const [order] = await db.select({ id: workOrder.id }).from(workOrder).where(eq(workOrder.id, id)).limit(1);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fileRows = await db
    .select({ fileKey: workOrderFile.fileKey })
    .from(workOrderFile)
    .where(eq(workOrderFile.workOrderId, id));
  const keys = fileRows.map((r) => r.fileKey).filter((k) => !!k?.trim());
  if (keys.length) {
    try {
      await utapi.deleteFiles(keys);
    } catch {
      return NextResponse.json(
        { error: "Failed to delete files from storage. Try again." },
        { status: 502 }
      );
    }
  }

  await db.delete(workOrder).where(eq(workOrder.id, id));
  return NextResponse.json({ success: true });
}
