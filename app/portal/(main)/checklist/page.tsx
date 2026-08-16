import { withAuth } from "@/lib/with-auth";
import { ChecklistClient } from "./checklist-client";

export default async function ChecklistPage() {
  const { user, role } = await withAuth({
    roles: ["owner", "technician", "client", "employee", "administrator"],
    unauthorizedUrl: "/portal/work-orders",
  });

  return (
    <ChecklistClient
      role={role}
      userId={user.id}
      technicianName={user.name}
    />
  );
}
