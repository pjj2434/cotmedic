import { withAuth } from "@/lib/with-auth";

export default async function ChecklistFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await withAuth({ roles: ["owner", "technician"] });
  return <>{children}</>;
}
