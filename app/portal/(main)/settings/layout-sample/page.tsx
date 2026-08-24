import { redirect } from "next/navigation";

/** Layout sample is now the live owner sidebar — keep URL from breaking old links. */
export default function OwnerLayoutSamplePage() {
  redirect("/portal");
}
