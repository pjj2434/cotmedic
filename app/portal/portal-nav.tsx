"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const allNavItems = [
  { href: "/portal", label: "Dashboard", roles: ["owner"] },
  { href: "/portal/employees", label: "Employees", roles: ["owner"] },
  { href: "/portal/customers", label: "Customers", roles: ["owner"] },
  { href: "/portal/work-orders", label: "Work Orders", roles: ["owner", "technician", "client"] },
  { href: "/portal/files", label: "Files", roles: ["client"] },
];

export function PortalNav({
  role,
  children,
}: { role?: string; children: React.ReactNode }) {
  const navItems = allNavItems.filter(
    (item) => role && item.roles.includes(role)
  );
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut({ fetchOptions: { method: "POST" } });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 shadow-sm print:hidden md:px-6">
        <div className="flex items-center gap-1 md:gap-2">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-red-50 text-red-700"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          Sign out
        </button>
      </nav>
      <main className="flex-1 p-4 print:p-0 md:p-6">{children}</main>
    </div>
  );
}
