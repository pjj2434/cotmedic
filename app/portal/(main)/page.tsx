import { withAuth } from "@/lib/with-auth";
import { redirect } from "next/navigation";
import { OwnerDashboard } from "./owner-dashboard";
import { getAnalytics } from "@/lib/analytics";

export default async function PortalPage() {
  const { session, role } = await withAuth();

  if (role === "owner") {
    const analytics = await getAnalytics();
    return <OwnerDashboard name={session.user.name} analytics={analytics} />;
  }
  if (role === "technician" || role === "client") {
    redirect("/portal/work-orders");
  }
  redirect("/portal/work-orders");
}
