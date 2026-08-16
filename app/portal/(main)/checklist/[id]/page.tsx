import { withAuth } from "@/lib/with-auth";
import { redirect } from "next/navigation";
import { ChecklistViewClient } from "./checklist-view-client";

export default async function ChecklistViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, role } = await withAuth({
    roles: ["owner", "technician", "client", "employee", "administrator"],
    unauthorizedUrl: "/portal/work-orders",
  });
  const { id } = await params;
  if (!id) redirect("/portal/checklist");
  return <ChecklistViewClient id={id} role={role} userId={user.id} />;
}
