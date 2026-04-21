import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PortalNav } from "./portal-nav";
import { OwnerPortalNav } from "./owner-portal-nav";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList });

  if (!session) {
    redirect("/");
  }

  const [urow] = await db
    .select({ resetPassword: user.resetPassword })
    .from(user)
    .where(eq(user.id, session.user.id));

  const pathname = headerList.get("x-pathname") ?? "";
  const onPasswordSettingsPage =
    pathname === "/portal/settings/password" ||
    pathname.startsWith("/portal/settings/password/");
  if (Boolean(urow?.resetPassword) && !onPasswordSettingsPage) {
    redirect("/portal/settings/password");
  }

  if (session.user.role === "owner") {
    return <OwnerPortalNav>{children}</OwnerPortalNav>;
  }

  return <PortalNav role={session.user.role ?? undefined}>{children}</PortalNav>;
}
