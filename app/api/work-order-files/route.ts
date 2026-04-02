import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { workOrder, workOrderFile } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { utapi } from "@/lib/uploadthing-server";

async function getAccessibleWorkOrderIds(role: string, userId: string) {
  if (role === "owner") return null;
  if (role === "technician") {
    const rows = await db
      .select({ id: workOrder.id })
      .from(workOrder)
      .where(eq(workOrder.technicianId, userId));
    return rows.map((r) => r.id);
  }
  const rows = await db
    .select({ id: workOrder.id })
    .from(workOrder)
    .where(eq(workOrder.customerId, userId));
  return rows.map((r) => r.id);
}

/** GET - List work-order files by workOrderId, or all visible to current user. */
export async function GET(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner", "technician", "client"] });
  if (authResult instanceof NextResponse) return authResult;
  const { user: authUser, role } = authResult;

  const { searchParams } = new URL(request.url);
  const workOrderId = searchParams.get("workOrderId");

  if (workOrderId) {
    const [order] = await db
      .select({ id: workOrder.id, customerId: workOrder.customerId, technicianId: workOrder.technicianId })
      .from(workOrder)
      .where(eq(workOrder.id, workOrderId))
      .limit(1);
    if (!order) return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    if (
      role !== "owner" &&
      !(role === "technician" && order.technicianId === authUser.id) &&
      !(role === "client" && order.customerId === authUser.id)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const files = await db
      .select()
      .from(workOrderFile)
      .where(eq(workOrderFile.workOrderId, workOrderId))
      .orderBy(desc(workOrderFile.createdAt));
    return NextResponse.json({ files });
  }

  const accessibleIds = await getAccessibleWorkOrderIds(role, authUser.id);
  if (accessibleIds && accessibleIds.length === 0) return NextResponse.json({ files: [] });

  const files = await db
    .select()
    .from(workOrderFile)
    .where(accessibleIds ? inArray(workOrderFile.workOrderId, accessibleIds) : undefined)
    .orderBy(desc(workOrderFile.createdAt));
  return NextResponse.json({ files });
}

/** DELETE - Remove a work-order file. Owners only. */
export async function DELETE(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [row] = await db.select().from(workOrderFile).where(eq(workOrderFile.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (row.fileKey?.trim()) {
    try {
      await utapi.deleteFiles(row.fileKey);
    } catch {
      return NextResponse.json(
        { error: "Failed to delete file from storage. Try again." },
        { status: 502 }
      );
    }
  }

  await db.delete(workOrderFile).where(eq(workOrderFile.id, id));
  return NextResponse.json({ success: true });
}
