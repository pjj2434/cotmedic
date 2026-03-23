import { withAuth } from "@/lib/with-auth";
import { EmployeesClient } from "./employees-client";

export default async function EmployeesPage() {
  await withAuth({ roles: ["owner"] });
  return <EmployeesClient />;
}
