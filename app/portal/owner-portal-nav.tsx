"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Database,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { OwnerPortalSearch } from "@/components/owner-portal-search";
import { authClient } from "@/lib/auth-client";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ownerNavItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/employees", label: "Employees", icon: Users },
  { href: "/portal/customers", label: "Locations & logins", icon: Building2 },
  { href: "/portal/client-database", label: "Client database", icon: Database },
  { href: "/portal/work-orders", label: "Work Orders", icon: ClipboardList },
  { href: "/portal/checklist", label: "Checklist", icon: ClipboardCheck },
  { href: "/portal/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/portal/settings/password", label: "Settings", icon: Settings },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/portal") return pathname === "/portal";
  if (href === "/portal/settings/password") {
    return (
      pathname === "/portal/settings/password" ||
      pathname.startsWith("/portal/settings/password/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OwnerPortalNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut({ fetchOptions: { method: "POST" } });
    router.push("/");
    router.refresh();
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon" className="border-r border-zinc-200 print:hidden">
          <SidebarHeader className="gap-3 border-b border-zinc-200 p-3">
            <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cotlogo.png" alt="Cot Medik" className="h-7 w-auto shrink-0" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/liftlogo.jpeg"
                alt="Lift Medik"
                className="h-7 w-auto shrink-0 rounded-sm group-data-[collapsible=icon]:hidden"
              />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Owner portal</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ownerNavItems.map(({ href, label, icon: Icon }) => {
                    const active = isNavActive(pathname, href);
                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={label}
                          className={cn(
                            active &&
                              "bg-red-50 text-red-700 data-[active=true]:bg-red-50 data-[active=true]:text-red-700"
                          )}
                        >
                          <Link href={href}>
                            <Icon />
                            <span>{label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-zinc-200 p-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  type="button"
                  tooltip="Sign out"
                  onClick={() => void handleSignOut()}
                >
                  <LogOut />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="bg-zinc-100 text-zinc-800 antialiased">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-3 print:hidden sm:px-4">
            <SidebarTrigger className="-ml-0.5" />
            <Separator orientation="vertical" className="mr-1 h-5" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">
                {ownerNavItems.find((item) => isNavActive(pathname, item.href))?.label ??
                  "Owner portal"}
              </p>
            </div>
            <OwnerPortalSearch />
          </header>
          <main className="min-w-0 flex-1 overflow-x-hidden p-4 print:p-0 sm:p-5 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
