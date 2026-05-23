import { Suspense } from "react";
import { withAuth } from "@/lib/with-auth";
import { WorkOrdersClient } from "./work-orders-client";

export default async function WorkOrdersPage() {
  const { user, role } = await withAuth({
    roles: ["owner", "technician", "client", "employee", "administrator"],
  });

  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-zinc-500">Loading work orders…</div>
      }
    >
      <WorkOrdersClient role={role} userName={user.name} userId={user.id} />
    </Suspense>
  );
}
