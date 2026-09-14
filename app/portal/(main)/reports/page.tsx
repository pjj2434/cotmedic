import { withAuth } from "@/lib/with-auth";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  await withAuth({ roles: ["client", "employee", "administrator"] });
  return <ReportsClient />;
}
