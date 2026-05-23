import { Suspense } from "react";
import { withAuth } from "@/lib/with-auth";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage() {
  await withAuth({ roles: ["owner"] });
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-zinc-500">Loading locations…</div>
      }
    >
      <CustomersClient />
    </Suspense>
  );
}
