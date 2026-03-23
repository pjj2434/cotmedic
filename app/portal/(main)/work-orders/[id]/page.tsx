import { withAuth } from "@/lib/with-auth";
import { redirect } from "next/navigation";
import { WorkOrderViewClient } from "./work-order-view-client";

export default async function WorkOrderViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await withAuth({ roles: ["owner", "technician", "client"] });
  const { id } = await params;
  if (!id) redirect("/portal/work-orders");
  return <WorkOrderViewClient id={id} />;
}
