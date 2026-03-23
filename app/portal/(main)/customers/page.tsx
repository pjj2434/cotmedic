import { withAuth } from "@/lib/with-auth";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage() {
  await withAuth({ roles: ["owner"] });
  return <CustomersClient />;
}
