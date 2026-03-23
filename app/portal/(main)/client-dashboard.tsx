"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type WorkOrder = {
  id: string;
  type: string;
  formData: string;
  createdAt: string;
  technicianName: string;
};

export function ClientDashboard({ name }: { name: string }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/work-orders")
      .then((res) => (res.ok ? res.json() : { workOrders: [] }))
      .then((data) => setWorkOrders(data.workOrders ?? []))
      .catch(() => setWorkOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Welcome, {name}</h1>
      <p className="mt-2 text-zinc-500">
        View your account and service requests.
      </p>
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-medium text-zinc-900">Your work orders</h2>
        {loading ? (
          <p className="mt-2 text-sm text-zinc-500">Loading…</p>
        ) : workOrders.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            No work orders yet. Your repair reports will appear here.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-zinc-100">
            {workOrders.map((o) => (
              <Link
                key={o.id}
                href={`/portal/work-orders/${o.id}`}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-zinc-50 -mx-2 px-2 rounded transition-colors"
              >
                <div>
                  <p className="font-medium text-zinc-900">
                    {o.type === "cot" ? "Cot Medik" : "Lift Medik"} repair report
                  </p>
                  <p className="text-sm text-zinc-500">
                    {o.technicianName} · {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <ChevronRight className="size-4 text-zinc-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
