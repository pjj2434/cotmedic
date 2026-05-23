import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { clientContact, clientRecord, user, workOrder } from "@/db/schema";
import { searchOwnerPortalPages } from "@/lib/owner-portal-pages";
import { extractPhoneDigits, phoneDigitsLike } from "@/lib/phone-search";
import {
  describeWorkOrderSearchMatch,
  workOrderPortalSearchConditions,
} from "@/lib/work-order-search";

const LIMIT = 6;

export type PortalSearchItem = {
  id: string;
  type: "page" | "client" | "contact" | "location" | "employee" | "work_order";
  title: string;
  subtitle?: string;
  href: string;
};

export type PortalSearchGroup = {
  label: string;
  items: PortalSearchItem[];
};

/** GET — Global owner portal search (?q=). */
export async function GET(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ groups: [] as PortalSearchGroup[] });
  }

  const pattern = `%${q}%`;
  const phoneDigits = extractPhoneDigits(q);
  const groups: PortalSearchGroup[] = [];

  const pages = searchOwnerPortalPages(q).slice(0, LIMIT);
  if (pages.length > 0) {
    groups.push({
      label: "Pages",
      items: pages.map((p) => ({
        id: `page:${p.href}`,
        type: "page",
        title: p.label,
        href: p.href,
      })),
    });
  }

  const clients = await db
    .select({
      id: clientRecord.id,
      name: clientRecord.name,
      companyName: clientRecord.companyName,
      email: clientRecord.email,
    })
    .from(clientRecord)
    .where(
      or(
        like(clientRecord.name, pattern),
        like(clientRecord.companyName, pattern),
        like(clientRecord.email, pattern),
        like(clientRecord.phone, pattern),
        phoneDigitsLike(clientRecord.phone, phoneDigits)
      )
    )
    .orderBy(asc(clientRecord.name))
    .limit(LIMIT);

  if (clients.length > 0) {
    groups.push({
      label: "Client database",
      items: clients.map((c) => ({
        id: `client:${c.id}`,
        type: "client",
        title: c.name,
        subtitle: c.companyName?.trim() || c.email?.trim() || undefined,
        href: `/portal/client-database/${c.id}`,
      })),
    });
  }

  const contactMatches = await db
    .select({
      contactId: clientContact.id,
      contactName: clientContact.name,
      location: clientContact.location,
      clientId: clientRecord.id,
      clientName: clientRecord.name,
    })
    .from(clientContact)
    .innerJoin(clientRecord, eq(clientContact.clientRecordId, clientRecord.id))
    .where(
      or(
        like(clientContact.name, pattern),
        like(clientContact.email, pattern),
        like(clientContact.phone, pattern),
        like(clientContact.location, pattern),
        like(clientContact.notes, pattern),
        phoneDigitsLike(clientContact.phone, phoneDigits)
      )
    )
    .orderBy(asc(clientContact.name))
    .limit(LIMIT);

  if (contactMatches.length > 0) {
    groups.push({
      label: "Contacts",
      items: contactMatches.map((c) => ({
        id: `contact:${c.contactId}`,
        type: "contact",
        title: c.contactName,
        subtitle: [c.location, c.clientName].filter(Boolean).join(" · ") || undefined,
        href: `/portal/client-database/${c.clientId}`,
      })),
    });
  }

  const locations = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
    })
    .from(user)
    .where(
      and(
        eq(user.role, "client"),
        or(
          like(user.name, pattern),
          like(user.email, pattern),
          like(user.username, pattern),
          like(user.address, pattern)
        )
      )
    )
    .orderBy(asc(user.name))
    .limit(LIMIT);

  if (locations.length > 0) {
    groups.push({
      label: "Locations & logins",
      items: locations.map((loc) => ({
        id: `location:${loc.id}`,
        type: "location",
        title: loc.name,
        subtitle: loc.email?.trim() || loc.address?.trim() || undefined,
        href: `/portal/customers?highlight=${loc.id}`,
      })),
    });
  }

  const staff = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
    .from(user)
    .where(
      and(
        inArray(user.role, ["technician", "administrator", "employee"]),
        or(
          like(user.name, pattern),
          like(user.email, pattern),
          like(user.username, pattern),
          like(user.displayUsername, pattern)
        )
      )
    )
    .orderBy(asc(user.name))
    .limit(LIMIT);

  if (staff.length > 0) {
    groups.push({
      label: "Employees & team",
      items: staff.map((s) => ({
        id: `employee:${s.id}`,
        type: "employee",
        title: s.name,
        subtitle: s.role ? String(s.role) : s.email?.trim() || undefined,
        href:
          s.role === "technician"
            ? `/portal/employees?highlight=${s.id}`
            : `/portal/customers?highlight=${s.id}`,
      })),
    });
  }

  const customer = alias(user, "workOrderCustomer");
  const technician = alias(user, "workOrderTechnician");

  const workOrderSearchWhere = workOrderPortalSearchConditions(
    pattern,
    customer.name,
    technician.name
  );

  const [workOrderCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(workOrder)
    .innerJoin(customer, eq(workOrder.customerId, customer.id))
    .innerJoin(technician, eq(workOrder.technicianId, technician.id))
    .where(workOrderSearchWhere);

  const workOrderMatchCount = Number(workOrderCountRow?.count ?? 0);

  const matchedWorkOrders = await db
    .select({
      id: workOrder.id,
      type: workOrder.type,
      formData: workOrder.formData,
      createdAt: workOrder.createdAt,
      customerName: customer.name,
      technicianName: technician.name,
    })
    .from(workOrder)
    .innerJoin(customer, eq(workOrder.customerId, customer.id))
    .innerJoin(technician, eq(workOrder.technicianId, technician.id))
    .where(workOrderSearchWhere)
    .orderBy(desc(workOrder.createdAt))
    .limit(LIMIT);

  const workOrderItems = matchedWorkOrders.map((o) => ({
    id: `work_order:${o.id}`,
    type: "work_order" as const,
    title: `${o.customerName} · ${o.type === "cot" ? "Cot Medik" : "Lift Medik"}`,
    subtitle: describeWorkOrderSearchMatch(q, {
      customerName: o.customerName,
      technicianName: o.technicianName,
      formData: o.formData,
      createdAt: o.createdAt,
    }),
    href: `/portal/work-orders/${o.id}`,
  }));

  if (workOrderItems.length > 0) {
    const viewAllItem =
      workOrderMatchCount >= 2
        ? [
            {
              id: `work_orders_q:${q}`,
              type: "page" as const,
              title: `View all ${workOrderMatchCount} work orders matching “${q}”`,
              subtitle: "Filtered work orders list",
              href: `/portal/work-orders?q=${encodeURIComponent(q)}`,
            },
          ]
        : [];

    groups.push({ label: "Work orders", items: [...viewAllItem, ...workOrderItems] });
  }

  return NextResponse.json({ groups });
}
