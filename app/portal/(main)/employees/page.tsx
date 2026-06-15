import { Suspense } from "react";
import { withAuth } from "@/lib/with-auth";
import { EmployeesClient, EmployeesPageSkeleton } from "./employees-client";

export default async function EmployeesPage() {
  await withAuth({ roles: ["owner"] });
  return (
    <Suspense fallback={<EmployeesPageSkeleton />}>
      <EmployeesClient />
    </Suspense>
  );
}
