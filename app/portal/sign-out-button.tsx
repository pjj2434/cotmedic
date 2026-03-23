"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut({ fetchOptions: { method: "POST" } });
    router.push("/");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      onClick={handleSignOut}
      className="mt-6 text-red-600 hover:bg-red-50 hover:text-red-700"
    >
      Sign out
    </Button>
  );
}
