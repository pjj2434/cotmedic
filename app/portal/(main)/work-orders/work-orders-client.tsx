"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, FileText, ChevronRight, Printer } from "lucide-react";
import Link from "next/link";
import { WorkOrderFormView } from "@/components/work-order-form-view";
import { printWorkOrderContent } from "@/lib/print-work-order";

type Customer = { id: string; name: string; customerType?: string };
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

function customerMatchesWorkType(
  customerType: string | undefined,
  workType: "cot" | "lift"
): boolean {
  const normalized = (customerType ?? "cot").trim().toLowerCase();
  if (!normalized) return workType === "cot";
  if (normalized === "both") return true;

  const types = normalized
    .split(/[,\s|/]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return types.includes(workType);
}

export function WorkOrdersClient({
  role,
  userName,
  userId,
}: {
  role: string;
  userName: string;
  userId: string;
}) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  // Technician: new work order flow
  const [workType, setWorkType] = useState<"cot" | "lift" | "">("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customersLoading, setCustomersLoading] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);
  const ticketScrollRef = useRef<HTMLDivElement>(null);

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      const res = await fetch(`/api/work-orders?${params}`);
      const data = await res.json();
      setWorkOrders(data.workOrders ?? []);
    } catch {
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  const fetchCustomers = useCallback(async (type: "cot" | "lift") => {
    setCustomersLoading(true);
    try {
      const { data: res } = await authClient.admin.listUsers({
        query: {
          filterField: "role",
          filterValue: "client",
          filterOperator: "eq",
          limit: 500,
        },
      });
      const users = (res as { users?: (Customer & { role?: string })[] })?.users ?? [];
      setCustomers(
        users.filter((u) => customerMatchesWorkType(u.customerType, type))
      );
    } catch {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  useEffect(() => {
    if (workType) fetchCustomers(workType);
    else setCustomers([]);
    setSelectedCustomer(null);
  }, [workType, fetchCustomers]);

  useEffect(() => {
    if (!selectedOrder) return;
    requestAnimationFrame(() => {
      if (ticketScrollRef.current) ticketScrollRef.current.scrollTop = 0;
    });
  }, [selectedOrder]);

  const filteredOrders = workOrders.filter((o) => {
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      return (
        o.customerName.toLowerCase().includes(q) ||
        o.technicianName.toLowerCase().includes(q) ||
        o.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formUrl =
    workType && selectedCustomer
      ? workType === "cot"
        ? `/repair-form?techName=${encodeURIComponent(userName)}&techId=${userId}&customerId=${selectedCustomer.id}&customerName=${encodeURIComponent(selectedCustomer.name)}&returnTo=${encodeURIComponent("/portal/work-orders")}`
        : `/lift-repair-form?techName=${encodeURIComponent(userName)}&techId=${userId}&customerId=${selectedCustomer.id}&customerName=${encodeURIComponent(selectedCustomer.name)}&returnTo=${encodeURIComponent("/portal/work-orders")}`
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Work Orders</h1>
        <p className="mt-2 text-zinc-500">
          {role === "owner"
            ? "View and filter all repair reports."
            : role === "client"
              ? "View your repair reports and service history."
              : "Start a new repair or view your completed work."}
        </p>
      </div>

      {role === "technician" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="font-medium text-zinc-900">New repair report</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Select the type and customer to start a repair form.
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Label className="w-14 shrink-0">Type</Label>
            <Select
              value={workType || "__none__"}
              onValueChange={(v) => setWorkType(v === "__none__" ? "" : (v as "cot" | "lift"))}
            >
              <SelectTrigger className="h-11 w-full px-3 text-base sm:h-9 sm:w-[160px] sm:px-2.5 sm:text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="min-h-11 px-3 text-base sm:min-h-8 sm:px-1.5 sm:text-sm" value="cot">
                  Cot Medik
                </SelectItem>
                <SelectItem className="min-h-11 px-3 text-base sm:min-h-8 sm:px-1.5 sm:text-sm" value="lift">
                  Lift Medik
                </SelectItem>
              </SelectContent>
            </Select>
            </div>
            {workType && (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Label className="w-16 shrink-0">Customer</Label>
                <Combobox
                  items={customers}
                  value={selectedCustomer}
                  onValueChange={(v) => setSelectedCustomer(v as Customer | null)}
                  itemToStringLabel={(c) => (c as Customer).name}
                  isItemEqualToValue={(a, b) => (a as Customer)?.id === (b as Customer)?.id}
                >
                  <ComboboxInput
                    className="h-11 w-full text-base sm:h-9 sm:w-[260px] sm:text-sm"
                    placeholder={customersLoading ? "Loading…" : "Search…"}
                    disabled={customersLoading}
                    showClear={!!selectedCustomer}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No customer found.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem
                          className="min-h-11 px-3 text-base sm:min-h-8 sm:px-1.5 sm:text-sm"
                          key={(item as Customer).id}
                          value={item as Customer}
                        >
                          {(item as Customer).name}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                </div>
                {formUrl && (
                  <Button asChild className="w-full bg-red-600 hover:bg-red-700 sm:w-auto">
                    <Link href={formUrl}>
                      <FileText className="mr-2 size-4" />
                      Open {workType === "cot" ? "Cot" : "Lift"} repair form
                    </Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-medium text-zinc-900">
            {role === "owner" ? "All work orders" : "Your work orders"}
          </h2>
          {role === "owner" && (
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="cot">Cot Medik</SelectItem>
                  <SelectItem value="lift">Lift Medik</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Search…"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-[180px] pl-9"
                />
              </div>
            </div>
          )}
          {role === "client" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search…"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-[180px] pl-9"
              />
            </div>
          )}
        </div>
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No work orders yet.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredOrders.map((o) => (
              <div
                key={o.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOrder(o)}
                onKeyDown={(e) => e.key === "Enter" && setSelectedOrder(o)}
                className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-zinc-50"
              >
                <div>
                  <p className="font-medium text-zinc-900">
                    {o.customerName} · {o.type === "cot" ? "Cot Medik" : "Lift Medik"}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {o.technicianName} · {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <ChevronRight className="size-4 text-zinc-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent
          className="max-h-[95vh] max-w-[900px] overflow-hidden p-0 sm:max-w-[900px]"
          showCloseButton={true}
          closeButtonClassName="text-red-600 hover:text-red-700 hover:bg-red-50"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {selectedOrder && (
            <>
              <DialogTitle className="sr-only">
                Work Order: {selectedOrder.customerName} · {selectedOrder.type === "cot" ? "Cot Medik" : "Lift Medik"}
              </DialogTitle>
              <div className="flex items-center justify-start gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => {
                    if (printContentRef.current) printWorkOrderContent(printContentRef.current);
                  }}
                >
                  <Printer className="mr-2 size-4" />
                  Print
                </Button>
              </div>
              <div
                ref={(node) => {
                  printContentRef.current = node;
                  ticketScrollRef.current = node;
                }}
                data-work-order-print
                className="max-h-[calc(95vh-52px)] overflow-y-auto"
              >
                <WorkOrderFormView type={selectedOrder.type} formData={selectedOrder.formData} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
