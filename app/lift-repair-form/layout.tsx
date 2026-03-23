import { withAuth } from "@/lib/with-auth";

export default async function LiftRepairFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await withAuth({ roles: ["owner", "technician"] });
  return <>{children}</>;
}
