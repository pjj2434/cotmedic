"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const ownerNavItems = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/employees", label: "Employees" },
  { href: "/portal/customers", label: "Customers" },
  { href: "/portal/work-orders", label: "Work Orders" },
];

export function OwnerPortalNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut({ fetchOptions: { method: "POST" } });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-zinc-100 text-zinc-800 antialiased">
      <nav className="sticky top-0 z-20 border-b border-zinc-200 bg-white px-4 py-3 print:hidden sm:px-5 md:px-6">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="text-sm font-semibold tracking-tight text-zinc-900">Portal</div>
          <button
            onClick={handleSignOut}
            aria-label="Sign Out"
            title="Sign Out"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
          >
            <LogOut className="size-4" />
          </button>
        </div>
        <div className="mt-3 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <div className="flex min-w-max items-center gap-1.5">
            {ownerNavItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium tracking-[-0.01em] transition-colors",
                  pathname === href || (href !== "/portal" && pathname.startsWith(`${href}/`))
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 print:p-0 sm:p-5 md:p-6">{children}</main>
      <footer className="mt-auto border-t border-zinc-200 bg-white px-4 py-3 print:hidden sm:px-5 md:px-6">
        <div className="flex items-center justify-center">
          <Link
            href="/portal/settings/password"
            className={cn(
              "text-xs tracking-tight text-zinc-500 transition-colors hover:text-zinc-700",
              pathname === "/portal/settings/password" ? "text-red-700" : ""
            )}
          >
            Change Password
          </Link>
        </div>
      </footer>
    </div>
  );
}
