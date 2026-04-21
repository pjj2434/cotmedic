import { auth } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/change-password-form";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function SettingsPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const [row] = await db
    .select({ resetPassword: user.resetPassword })
    .from(user)
    .where(eq(user.id, session.user.id));

  const forced = Boolean(row?.resetPassword);
  return <ChangePasswordForm variant={forced ? "forced" : "voluntary"} />;
}
