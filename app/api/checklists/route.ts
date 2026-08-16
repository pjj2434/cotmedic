import { NextResponse } from "next/server";
import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { checklist, user } from "@/db/schema";
import { formatCalendarIsoDate, parseWorkOrderDateToIso } from "@/lib/work-order-date";
import { workOrderCustomerScope } from "@/lib/portal-access";

type WorkType = "cot"; // "lift" later when Lift Medik checklist exists

function parseChecklistMeta(formData: string) {
  try {
    const data = JSON.parse(formData) as Record<string, unknown>;
    const dateIso = parseWorkOrderDateToIso(data.dateOfService);
    return {
      dateIso,
      dateLabel: dateIso ? formatCalendarIsoDate(dateIso) : "—",
      serialNumber: typeof data.serialNumber === "string" ? data.serialNumber.trim() : "",
      workOrderType: typeof data.workOrderType === "string" ? data.workOrderType.trim() : "",
    };
  } catch {
    return { dateIso: "", dateLabel: "—", serialNumber: "", workOrderType: "" };
  }
}

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

/** GET - List checklists. Owner all; technician own; location roles see their locations. */
export async function GET(request: Request) {
  const authResult = await withAuthApi({
    roles: ["owner", "technician", "client", "employee", "administrator"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { user: authUser, role } = authResult;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") as WorkType | null;

  const conditions: SQL[] = [];
  if (id) conditions.push(eq(checklist.id, id));
  if (type === "cot") conditions.push(eq(checklist.type, type));
  if (role === "technician") conditions.push(eq(checklist.technicianId, authUser.id));
  if (role === "client" || role === "employee" || role === "administrator") {
    const scopeResult = appendChecklistCustomerScope(role, authUser, conditions);
    if (scopeResult === "empty") {
      if (id) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ checklists: [] });
    }
  }

  const technicianUser = alias(user, "checklistTechnician");
  const customerUser = alias(user, "checklistCustomer");
  const submitterUser = alias(user, "checklistSubmitter");
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: checklist.id,
      technicianId: checklist.technicianId,
      customerId: checklist.customerId,
      type: checklist.type,
      formData: checklist.formData,
      submittedById: checklist.submittedById,
      createdAt: checklist.createdAt,
      updatedAt: checklist.updatedAt,
      technicianName: technicianUser.name,
      customerName: customerUser.name,
      submittedByName: submitterUser.name,
    })
    .from(checklist)
    .innerJoin(technicianUser, eq(checklist.technicianId, technicianUser.id))
    .innerJoin(customerUser, eq(checklist.customerId, customerUser.id))
    .leftJoin(submitterUser, eq(checklist.submittedById, submitterUser.id))
    .where(whereClause)
    .orderBy(desc(checklist.createdAt));

  const checklists = rows.map((row) => {
    const meta = parseChecklistMeta(row.formData);
    return {
      ...row,
      technicianName: row.technicianName ?? "—",
      customerName: row.customerName ?? "—",
      submittedByName: row.submittedById ? (row.submittedByName ?? "—") : null,
      workDateIso: meta.dateIso,
      workDateLabel: meta.dateLabel,
      serialNumber: meta.serialNumber,
      workOrderType: meta.workOrderType,
    };
  });

  if (id) {
    const single = checklists[0];
    if (!single) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(single);
  }

  return NextResponse.json({ checklists });
}

/** POST - Create checklist. Technician can create own; owner can create on behalf of a technician. */
export async function POST(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner", "technician"] });
  if (authResult instanceof NextResponse) return authResult;
  const { user: authUser, role } = authResult;

  let body: {
    type: WorkType;
    customerId: string;
    formData: unknown;
    technicianId?: string;
  };
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
  // Checklist is COTMEDIC-only for now; allow "lift" later when that form exists.
  if (type !== "cot") {
    return NextResponse.json({ error: "type must be cot (COTMEDIC)" }, { status: 400 });
  }

  const dateOfService =
    typeof formData === "object" && formData && "dateOfService" in formData
      ? parseWorkOrderDateToIso((formData as Record<string, unknown>).dateOfService)
      : "";
  if (!dateOfService) {
    return NextResponse.json({ error: "Date of service is required" }, { status: 400 });
  }

  const customer = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.id, customerId), eq(user.role, "client")))
    .limit(1);
  if (!customer[0]) {
    return NextResponse.json({ error: "Invalid customerId" }, { status: 400 });
  }

  let assignedTechnicianId = authUser.id;
  if (role === "owner") {
    const requested = String(technicianId ?? "").trim();
    if (!requested) {
      return NextResponse.json(
        { error: "technicianId is required for owner submissions" },
        { status: 400 }
      );
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

  await db.insert(checklist).values({
    id,
    technicianId: assignedTechnicianId,
    customerId,
    type,
    formData: JSON.stringify(formData),
    submittedById: authUser.id,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id, success: true });
}

/** DELETE - Remove checklist. Owners only. */
export async function DELETE(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const [row] = await db.select({ id: checklist.id }).from(checklist).where(eq(checklist.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(checklist).where(eq(checklist.id, id));
  return NextResponse.json({ success: true });
}
