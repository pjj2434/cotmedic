import { withAuth } from "@/lib/with-auth";
import { OwnerLayoutSample } from "./owner-layout-sample";

export default async function OwnerLayoutSamplePage() {
  await withAuth({ roles: ["owner"], unauthorizedUrl: "/portal/settings/password" });
  return <OwnerLayoutSample />;
}
