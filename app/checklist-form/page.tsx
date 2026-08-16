import { Suspense } from "react";
import { withAuth } from "@/lib/with-auth";
import { ChecklistFormClient } from "./checklist-form-client";

export default async function ChecklistFormPage() {
  const { user, role } = await withAuth({ roles: ["owner", "technician"] });

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#e8e8e8] text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <ChecklistFormClient role={role} userId={user.id} userName={user.name} />
    </Suspense>
  );
}
