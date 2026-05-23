import { withAuth } from "@/lib/with-auth";
import { ClientDatabaseClient } from "./client-database-client";

export default async function ClientDatabasePage() {
  await withAuth({ roles: ["owner"] });
  return <ClientDatabaseClient />;
}
