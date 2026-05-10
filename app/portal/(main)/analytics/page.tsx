import { withAuth } from "@/lib/with-auth";
import { AnalyticsPageClient } from "./analytics-client";

export default async function AnalyticsPage() {
  await withAuth({ roles: ["owner"], unauthorizedUrl: "/portal/work-orders" });
  return (
    <div className="-mx-4 w-[calc(100%+2rem)] max-w-none px-3 sm:-mx-5 sm:w-[calc(100%+2.5rem)] sm:px-4 md:-mx-6 md:w-[calc(100%+3rem)] md:px-5">
      <AnalyticsPageClient />
    </div>
  );
}
