import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PortalNav } from "./portal-nav";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/");
  }

  return <PortalNav role={session.user.role ?? undefined}>{children}</PortalNav>;
}
