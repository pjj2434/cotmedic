import Link from "next/link";
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
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xl font-semibold text-zinc-900">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

export function OwnerDashboard({ name, analytics }: { name: string; analytics: Analytics }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Welcome, {name}</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage employees, customers, and work orders.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          value={analytics.totalWorkOrders}
          label="Work orders"
          sub={`${analytics.workOrdersThisMonth} this month · Cot: ${analytics.cotCount} / Lift: ${analytics.liftCount}`}
        />
        <StatCard value={analytics.totalCustomers} label="Customers" />
        <StatCard value={analytics.totalTechnicians} label="Technicians" />
        <StatCard value={analytics.totalFiles} label="Client files" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/portal/employees"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
        >
          Employees
        </Link>
        <Link
          href="/portal/customers"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
        >
          Customers
        </Link>
        <Link
          href="/portal/work-orders"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
        >
          Work orders
        </Link>
      </div>

      {analytics.recentOrders.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <h2 className="border-b border-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900">
            Recent work orders
          </h2>
          <ul className="divide-y divide-zinc-100">
            {analytics.recentOrders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/portal/work-orders/${o.id}`}
                  className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-zinc-50"
                >
                  <span className="font-medium text-zinc-900">
                    {o.type === "cot" ? "Cot" : "Lift"} · {new Date(o.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-zinc-500">
                    {new Date(o.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
