"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const clientNavIconBtn =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1";

const allNavItems = [
  { href: "/portal", label: "Dashboard", roles: ["owner"] },
  { href: "/portal/employees", label: "Employees", roles: ["owner"] },
  { href: "/portal/customers", label: "Customers", roles: ["owner"] },
  { href: "/portal/work-orders", label: "Work Orders", roles: ["owner", "technician", "client"] },
  { href: "/portal/files", label: "Files", roles: ["client"] },
  { href: "/portal/settings/password", label: "Settings", roles: ["client"] },
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
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-zinc-100 text-zinc-800 antialiased">
      <nav className="sticky top-0 z-20 border-b border-zinc-200 bg-white px-4 py-3 print:hidden sm:px-5 md:px-6">
        <div
          className={cn(
            "min-w-0",
            role === "client" ? "w-full" : "flex items-center justify-between gap-3"
          )}
        >
          {role === "client" ? (
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="min-w-0" aria-hidden />
              <div className="flex items-center justify-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/cotlogo.png" alt="Cot Medik" className="h-8 w-auto sm:h-9" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/liftlogo.jpeg" alt="Lift Medik" className="h-8 w-auto rounded-sm sm:h-9" />
              </div>
              <div className="flex min-w-0 items-center justify-end">
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign Out"
                  title="Sign Out"
                  className={clientNavIconBtn}
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm font-semibold tracking-tight text-zinc-900">Portal</div>
          )}
        </div>
        {role !== "client" && (
          <div className="mt-3 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <div className="flex min-w-max items-center gap-1.5">
              {navItems.map(({ href, label }) => (
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
        )}
      </nav>

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 print:p-0 sm:p-5 md:p-6">{children}</main>
      <footer
        className={cn(
          "mt-auto border-t border-zinc-200 px-4 py-3 print:hidden sm:px-5 md:px-6",
          role === "client" ? "bg-zinc-100" : "bg-white"
        )}
      >
        <div className="flex items-center justify-end gap-2">
          {role !== "client" && (
            <>
              <Link
                href="/portal/settings/password"
                className={cn(
                  "rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium tracking-[-0.01em] text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900",
                  pathname === "/portal/settings/password"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : ""
                )}
              >
                Change Password
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium tracking-[-0.01em] text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
