import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { user, workOrder } from "@/db/schema";
import {
  describeWorkOrderSearchMatch,
  workOrderPortalSearchConditions,
} from "@/lib/work-order-search";
import { parseWorkOrderFormDateTime } from "@/lib/work-order-date";

const LIMIT = 8;

export type TechnicianWorkOrderSearchItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

/** GET — Technician work-order search only (?q=). */
export async function GET(request: Request) {
  const authResult = await withAuthApi({ roles: ["technician"] });
  if (authResult instanceof NextResponse) return authResult;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ items: [] as TechnicianWorkOrderSearchItem[], total: 0 });
  }

  const pattern = `%${q}%`;
  const customer = alias(user, "workOrderCustomer");
  const technician = alias(user, "workOrderTechnician");

  const workOrderSearchWhere = workOrderPortalSearchConditions(
    pattern,
    customer.name,
    technician.name
  );

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(workOrder)
    .innerJoin(customer, eq(workOrder.customerId, customer.id))
    .innerJoin(technician, eq(workOrder.technicianId, technician.id))
    .where(workOrderSearchWhere);

  const total = Number(countRow?.count ?? 0);

  const rows = await db
    .select({
      id: workOrder.id,
      type: workOrder.type,
      formData: workOrder.formData,
      customerName: customer.name,
      technicianName: technician.name,
    })
    .from(workOrder)
    .innerJoin(customer, eq(workOrder.customerId, customer.id))
    .innerJoin(technician, eq(workOrder.technicianId, technician.id))
    .where(workOrderSearchWhere)
    .orderBy(desc(workOrder.createdAt))
    .limit(LIMIT);

  const items: TechnicianWorkOrderSearchItem[] = rows.map((o) => {
    const { dateIso } = parseWorkOrderFormDateTime(o.formData);
    return {
      id: o.id,
      title: `${o.customerName} · ${o.type === "cot" ? "Cot Medik" : "Lift Medik"}`,
      subtitle: describeWorkOrderSearchMatch(q, {
        customerName: o.customerName,
        technicianName: o.technicianName,
        formData: o.formData,
        workDateIso: dateIso,
      }),
      href: `/portal/work-orders/${o.id}`,
    };
  });

  if (total >= 2) {
    items.unshift({
      id: `view-all:${q}`,
      title: `View all ${total} work orders matching “${q}”`,
      subtitle: "Open filtered list",
      href: `/portal/work-orders?q=${encodeURIComponent(q)}`,
    });
  }

  return NextResponse.json({ items, total });
}
