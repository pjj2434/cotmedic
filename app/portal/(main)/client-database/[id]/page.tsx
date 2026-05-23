import { withAuth } from "@/lib/with-auth";
import { ClientDetailClient } from "./client-detail-client";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await withAuth({ roles: ["owner"] });
  const { id } = await params;
  return <ClientDetailClient id={id} />;
}
