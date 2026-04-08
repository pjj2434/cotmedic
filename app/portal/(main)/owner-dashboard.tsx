import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  ClipboardList,
  FileStack,
  Users,
} from "lucide-react";
import type { Analytics } from "@/lib/analytics";

function StatCard({
  value,
  label,
  sub,
}: {
  value: number | string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm font-medium text-zinc-600">{label}</p>
      {sub && <p className="mt-2 text-xs leading-relaxed text-zinc-500">{sub}</p>}
    </div>
  );
}

const quickLinkClass =
  "group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50/40 sm:p-5";

export function OwnerDashboard({ name, analytics }: { name: string; analytics: Analytics }) {
  const nyDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
  const nyTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-red-700">Admin</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          Welcome back, {name}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
          Manage technicians, locations, and work orders from one place.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-zinc-900">Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            value={analytics.totalWorkOrders}
            label="Work orders"
            sub={`${analytics.workOrdersThisMonth} this month · Cot ${analytics.cotCount} · Lift ${analytics.liftCount}`}
          />
          <StatCard value={analytics.totalCustomers} label="Locations" />
          <StatCard value={analytics.totalTechnicians} label="Technicians" />
          <StatCard value={analytics.totalFiles} label="WO attachments" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-zinc-900">Quick links</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/portal/employees" className={quickLinkClass}>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <Users className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">Technicians</p>
              <p className="text-sm text-zinc-500">Accounts & access</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-zinc-300 transition-colors group-hover:text-red-600" />
          </Link>
          <Link href="/portal/customers" className={quickLinkClass}>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">Locations & logins</p>
              <p className="text-sm text-zinc-500">Customers & portal users</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-zinc-300 transition-colors group-hover:text-red-600" />
          </Link>
          <Link href="/portal/work-orders" className={quickLinkClass}>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <ClipboardList className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">Work orders</p>
              <p className="text-sm text-zinc-500">Browse & print reports</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-zinc-300 transition-colors group-hover:text-red-600" />
          </Link>
        </div>
      </div>

      {analytics.recentOrders.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <FileStack className="size-4 text-zinc-400" />
              <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Recent work orders</h2>
            </div>
            <Link
              href="/portal/work-orders"
              className="text-sm font-medium text-red-700 transition-colors hover:text-red-800"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y divide-zinc-100">
            {analytics.recentOrders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/portal/work-orders/${o.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">
                      {o.type === "cot" ? "Cot Medik" : "Lift Medik"} ·{" "}
                      {nyDate.format(new Date(o.createdAt))}
                    </p>
                    {!o.hasFiles && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-800">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        <span>No file attached</span>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm text-zinc-500">
                      {nyTime.format(new Date(o.createdAt))}
                    </span>
                    <ChevronRight className="size-4 text-zinc-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
