import { withAuth } from "@/lib/with-auth";
import { redirect } from "next/navigation";
import { CustomerFilesClient } from "./customer-files-client";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function CustomerFilesPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await withAuth({ roles: ["owner"] });
  const { clientId } = await params;
  if (!clientId) redirect("/portal/customers");

  const [client] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.id, clientId))
    .limit(1);

  if (!client) redirect("/portal/customers");

  return (
    <CustomerFilesClient clientId={client.id} clientName={client.name} />
  );
}
