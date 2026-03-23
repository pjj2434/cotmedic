import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function MainPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.resetPassword === true) {
    redirect("/portal/change-password");
  }
  return <>{children}</>;
}
