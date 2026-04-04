import { withAuth } from "@/lib/with-auth";
import { FilesClient } from "./files-client";

export default async function FilesPage() {
  await withAuth({ roles: ["client", "employee", "administrator"] });
  return <FilesClient />;
}
