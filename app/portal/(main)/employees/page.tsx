import { Suspense } from "react";
import { withAuth } from "@/lib/with-auth";
import { EmployeesClient } from "./employees-client";

export default async function EmployeesPage() {
  await withAuth({ roles: ["owner"] });
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-zinc-500">Loading employees…</div>
      }
    >
      <EmployeesClient />
    </Suspense>
  );
}
