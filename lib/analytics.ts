import { db } from "@/db";
import { workOrder, user, workOrderFile } from "@/db/schema";
import { eq, sql, desc, gte, inArray } from "drizzle-orm";

export type Analytics = {
  totalWorkOrders: number;
  workOrdersThisMonth: number;
  cotCount: number;
  liftCount: number;
  totalCustomers: number;
  totalTechnicians: number;
  totalFiles: number;
  recentOrders: { id: string; type: string; createdAt: string; hasFiles: boolean }[];
};

export async function getAnalytics(): Promise<Analytics> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [totalWorkOrders, workOrdersThisMonth, cotCount, liftCount, totalCustomers, totalTechnicians, totalFiles, recentOrders] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(workOrder),
    db.select({ count: sql<number>`count(*)` }).from(workOrder).where(gte(workOrder.createdAt, startOfMonth)),
    db.select({ count: sql<number>`count(*)` }).from(workOrder).where(eq(workOrder.type, "cot")),
    db.select({ count: sql<number>`count(*)` }).from(workOrder).where(eq(workOrder.type, "lift")),
    db.select({ count: sql<number>`count(*)` }).from(user).where(eq(user.role, "client")),
    db.select({ count: sql<number>`count(*)` }).from(user).where(eq(user.role, "technician")),
    db.select({ count: sql<number>`count(*)` }).from(workOrderFile),
    db.select({
      id: workOrder.id,
      type: workOrder.type,
      createdAt: workOrder.createdAt,
    })
      .from(workOrder)
      .orderBy(desc(workOrder.createdAt))
      .limit(5),
  ]);

  const recentIds = recentOrders.map((o) => o.id);
  const fileRows = recentIds.length
    ? await db
        .selectDistinct({ workOrderId: workOrderFile.workOrderId })
        .from(workOrderFile)
        .where(inArray(workOrderFile.workOrderId, recentIds))
    : [];
  const fileOrderIds = new Set(fileRows.map((f) => f.workOrderId));

  return {
    totalWorkOrders: Number(totalWorkOrders[0]?.count ?? 0),
    workOrdersThisMonth: Number(workOrdersThisMonth[0]?.count ?? 0),
    cotCount: Number(cotCount[0]?.count ?? 0),
    liftCount: Number(liftCount[0]?.count ?? 0),
    totalCustomers: Number(totalCustomers[0]?.count ?? 0),
    totalTechnicians: Number(totalTechnicians[0]?.count ?? 0),
    totalFiles: Number(totalFiles[0]?.count ?? 0),
    recentOrders: recentOrders.map((o) => ({
      ...o,
      hasFiles: fileOrderIds.has(o.id),
    })),
  };
}
