import { withAuth } from "@/lib/with-auth";
import { WorkOrdersClient } from "./work-orders-client";

export default async function WorkOrdersPage() {
  const { user, role } = await withAuth({ roles: ["owner", "technician", "client"] });

  return (
    <WorkOrdersClient
      role={role}
      userName={user.name}
      userId={user.id}
    />
  );
}
