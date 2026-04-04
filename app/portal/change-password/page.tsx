import { redirect } from "next/navigation";

/** Legacy URL: password changes happen under Settings. */
export default function ChangePasswordPage() {
  redirect("/portal/settings/password");
}
