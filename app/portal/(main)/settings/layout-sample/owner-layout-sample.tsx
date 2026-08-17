"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Database,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { OWNER_PORTAL_PAGES } from "@/lib/owner-portal-pages";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const navIcons: Record<string, ComponentType<{ className?: string }>> = {
  "/portal": LayoutDashboard,
  "/portal/employees": Users,
  "/portal/customers": Building2,
  "/portal/client-database": Database,
  "/portal/work-orders": ClipboardList,
  "/portal/checklist": ClipboardCheck,
  "/portal/analytics": BarChart3,
  "/portal/settings/password": Settings,
};

export function OwnerLayoutSample() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...OWNER_PORTAL_PAGES];
    return OWNER_PORTAL_PAGES.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.keywords.toLowerCase().includes(q) ||
        p.href.toLowerCase().includes(q)
    );
  }, [query]);

  async function handleSignOut() {
    await authClient.signOut({ fetchOptions: { method: "POST" } });
    router.push("/");
    router.refresh();
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon" className="border-r border-zinc-200">
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
          <div className="relative group-data-[collapsible=icon]:hidden">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-zinc-400" />
            <SidebarInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages…"
              className="h-9 pl-8"
              aria-label="Search navigation"
            />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Owner portal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredNav.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-zinc-500 group-data-[collapsible=icon]:hidden">
                    No matching pages
                  </p>
                ) : (
                  filteredNav.map((item) => {
                    const Icon = navIcons[item.href] ?? LayoutDashboard;
                    const isActive = item.href === "/portal";
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          type="button"
                          isActive={isActive}
                          tooltip={item.label}
                          className={
                            isActive
                              ? "bg-red-50 text-red-700 data-[active=true]:bg-red-50 data-[active=true]:text-red-700"
                              : undefined
                          }
                        >
                          <Icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-zinc-200 gap-2 p-3">
          <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
            <Link href="/portal/settings/password">
              <ArrowLeft className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">Exit sample</span>
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-zinc-600"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="size-4" />
            <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-zinc-100">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-5" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900">Layout sample</p>
            <p className="truncate text-xs text-zinc-500">
              Sidebar owner chrome preview — navigation is demo-only
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="ml-auto shrink-0">
            <Link href="/portal/settings/password">Exit sample</Link>
          </Button>
        </header>

        <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              Sample preview
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
              This is a layout sample for owners. Use the sidebar search to filter pages, collapse
              the sidebar with the trigger, and return to Settings when you are done comparing it
              to the current top-tab navigation.
            </p>
          </section>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Open work orders", value: "—" },
              { label: "Locations", value: "—" },
              { label: "Technicians", value: "—" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">{stat.value}</p>
              </div>
            ))}
          </div>

          <section className="rounded-xl border border-dashed border-zinc-300 bg-white/70 p-6">
            <h2 className="text-sm font-medium text-zinc-900">Placeholder content</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Real dashboard widgets are not loaded here — this page only demonstrates the alternate
              owner shell.
            </p>
          </section>
        </div>
      </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
