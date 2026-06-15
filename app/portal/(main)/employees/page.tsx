import { Suspense } from "react";
import { withAuth } from "@/lib/with-auth";
import { EmployeesClient } from "./employees-client";

export default async function EmployeesPage() {
  await withAuth({ roles: ["owner"] });
  return (
    <Suspense fallback={null}>
      <EmployeesClient />
    </Suspense>
  );
}
