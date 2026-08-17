import Link from "next/link";
import { auth } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Button } from "@/components/ui/button";
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
  const isOwner = session.user.role === "owner";

  return (
    <div>
      <ChangePasswordForm variant={forced ? "forced" : "voluntary"} />
      {isOwner && !forced && (
        <div className="mx-auto mt-2 w-full max-w-md border-t border-zinc-200 px-4 pb-10 pt-8 md:max-w-xl md:px-8">
          <p className="text-sm text-zinc-500">
            Preview an alternate owner portal layout with a sidebar and search.
          </p>
          <Button asChild variant="outline" className="mt-3">
            <Link href="/portal/settings/layout-sample">View sample</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
