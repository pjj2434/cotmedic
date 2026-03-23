"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WorkOrderFormView } from "@/components/work-order-form-view";
import { printWorkOrderContent } from "@/lib/print-work-order";

type WorkOrder = {
  id: string;
  technicianId: string;
  customerId: string;
  type: string;
  formData: string;
  createdAt: string;
  technicianName: string;
  customerName: string;
};

export function WorkOrderViewClient({ id }: { id: string }) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/work-orders?id=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Not found" : "Failed to load");
        return res.json();
      })
      .then((data) => setWorkOrder(data))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    if (printContentRef.current && workOrder) printWorkOrderContent(printContentRef.current);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }
  if (error || !workOrder) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-100">
        <p className="text-zinc-600">{error === "Not found" ? "Work order not found" : "Failed to load"}</p>
        <Button asChild variant="outline">
          <Link href="/portal/work-orders">
            <ArrowLeft className="mr-2 size-4" />
            Back to Work Orders
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-200">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-300 bg-white px-4 py-3 shadow-sm">
        <Button variant="outline" size="sm" asChild>
          <Link href="/portal/work-orders">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
        <Button size="sm" className="hidden sm:inline-flex" onClick={handlePrint}>
          <Printer className="mr-2 size-4" />
          Print
        </Button>
      </div>
      <div ref={printContentRef} className="p-4">
        <WorkOrderFormView type={workOrder.type} formData={workOrder.formData} />
      </div>
    </div>
  );
}
