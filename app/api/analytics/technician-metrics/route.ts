import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { workOrder, user } from "@/db/schema";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { NextResponse } from "next/server";
import { ANALYTICS_TIME_ZONE } from "@/lib/week-bounds-ny";
import {
  enumerateYmBetween,
  firstUtcInstantNyYmd,
  getNyRangeQueryBounds,
} from "@/lib/ny-calendar";

export type TechnicianMetricsWorkType = "cot" | "lift" | "both";

const MAX_RANGE_DAYS = 800;

function formatMonthAxisLabel(yearMonth: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(yearMonth.trim());
  if (!m) return yearMonth;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = new Date(Date.UTC(y, mo - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ANALYTICS_TIME_ZONE,
    month: "short",
    year: "numeric",
  }).format(d);
}

function daySpanInclusive(fromYmd: string, toYmd: string): number {
  const a = firstUtcInstantNyYmd(fromYmd);
  const b = firstUtcInstantNyYmd(toYmd);
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

/** GET — Owner-only technician submission analytics (excludes owner-submitted tickets and legacy rows without submittedById). */
export async function GET(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type") as TechnicianMetricsWorkType | null;
  const technicianFilter = String(searchParams.get("technicianId") ?? "").trim();
  const chartParam = searchParams.get("chart") ?? "technician";
  const chart = chartParam === "month" ? "month" : "technician";
  const fromYmd = String(searchParams.get("from") ?? "").trim();
  const toYmd = String(searchParams.get("to") ?? "").trim();

  if (typeParam !== "cot" && typeParam !== "lift" && typeParam !== "both") {
    return NextResponse.json({ error: "type query must be cot, lift, or both" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(toYmd)) {
    return NextResponse.json(
      { error: "from and to are required as YYYY-MM-DD (Eastern calendar dates)" },
      { status: 400 }
    );
  }
  if (fromYmd > toYmd) {
    return NextResponse.json({ error: "from must be on or before to" }, { status: 400 });
  }

  let startIso: string;
  let endExclusiveIso: string;
  try {
    const b = getNyRangeQueryBounds(fromYmd, toYmd);
    startIso = b.startIso;
    endExclusiveIso = b.endExclusiveIso;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid date range" },
      { status: 400 }
    );
  }

  const spanDays = daySpanInclusive(fromYmd, toYmd);
  if (spanDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Date range cannot exceed ${MAX_RANGE_DAYS} days` },
      { status: 400 }
    );
  }

  const submitter = alias(user, "submitter");
  const technician = alias(user, "technician");

  const inDateRange = and(
    gte(workOrder.createdAt, startIso),
    lt(workOrder.createdAt, endExclusiveIso)
  );

  const typeCondition =
    typeParam === "both"
      ? inArray(workOrder.type, ["cot", "lift"])
      : eq(workOrder.type, typeParam);

  const baseQualifying = and(
    typeCondition,
    eq(submitter.role, "technician"),
    ...(technicianFilter ? [eq(workOrder.technicianId, technicianFilter)] : [])
  );

  const scoped = and(baseQualifying, inDateRange);

  const technicians = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.role, "technician"));

  const countsRows =
    chart === "technician"
      ? await db
          .select({
            technicianId: workOrder.technicianId,
            count: sql<number>`count(*)`,
          })
          .from(workOrder)
          .innerJoin(submitter, eq(workOrder.submittedById, submitter.id))
          .where(scoped)
          .groupBy(workOrder.technicianId)
      : [];

  const countByTech = new Map(countsRows.map((r) => [r.technicianId, Number(r.count ?? 0)]));

  const technicianBars = technicians
    .map((t) => ({
      key: t.id,
      name: String(t.name ?? "").trim() || "Unnamed technician",
      count: countByTech.get(t.id) ?? 0,
    }))
    .filter((b) => !technicianFilter || b.key === technicianFilter)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const monthKeyExpr = sql<string>`strftime('%Y-%m', datetime(${workOrder.createdAt}))`;

  const monthlyRows =
    chart === "month"
      ? await db
          .select({
            monthKey: monthKeyExpr,
            count: sql<number>`count(*)`,
          })
          .from(workOrder)
          .innerJoin(submitter, eq(workOrder.submittedById, submitter.id))
          .where(scoped)
          .groupBy(monthKeyExpr)
      : [];

  const countByMonth = new Map(monthlyRows.map((r) => [r.monthKey, Number(r.count ?? 0)]));

  const monthKeysOrdered = enumerateYmBetween(fromYmd, toYmd);

  const monthBars = monthKeysOrdered.map((k) => ({
    key: k,
    name: formatMonthAxisLabel(k),
    count: countByMonth.get(k) ?? 0,
  }));

  const bars = chart === "month" ? monthBars : technicianBars;

  const [lastRow] = await db
    .select({
      technicianId: workOrder.technicianId,
      submittedAt: workOrder.createdAt,
      technicianName: technician.name,
    })
    .from(workOrder)
    .innerJoin(submitter, eq(workOrder.submittedById, submitter.id))
    .innerJoin(technician, eq(workOrder.technicianId, technician.id))
    .where(scoped)
    .orderBy(desc(workOrder.createdAt))
    .limit(1);

  const submittedInRange = await db
    .selectDistinct({ technicianId: workOrder.technicianId })
    .from(workOrder)
    .innerJoin(submitter, eq(workOrder.submittedById, submitter.id))
    .where(scoped);

  const submittedIds = new Set(submittedInRange.map((r) => r.technicianId));

  const techScope = technicianFilter
    ? technicians.filter((t) => t.id === technicianFilter)
    : technicians;

  const missingInRange = techScope
    .filter((t) => !submittedIds.has(t.id))
    .map((t) => ({
      id: t.id,
      name: String(t.name ?? "").trim() || "Unnamed technician",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    workType: typeParam,
    timeZone: ANALYTICS_TIME_ZONE,
    chart,
    dateRange: { from: fromYmd, to: toYmd },
    rangeUtc: { start: startIso, endExclusive: endExclusiveIso },
    bars,
    lastSubmission: lastRow
      ? {
          technicianId: lastRow.technicianId,
          technicianName: String(lastRow.technicianName ?? "").trim() || "—",
          submittedAt: lastRow.submittedAt,
        }
      : null,
    missingInRange,
  });
}
