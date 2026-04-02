"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { FileText, ChevronRight, Printer, AlertTriangle } from "lucide-react";
import Link from "next/link";
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
  hasFiles?: boolean;
};

type ParsedWorkOrderFields = {
  dateIso: string;
  serial: string;
  ambulance: string;
  notes: string;
  partsUsed: string;
  partsNeeded: string;
  extraDetails: string;
};

function parseDateToIso(value: unknown): string {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!us) return "";
  const mm = Number(us[1]);
  const dd = Number(us[2]);
  const yyyy = Number(us[3]);
  const d = new Date(yyyy, mm - 1, dd);
  const valid = d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd;
  if (!valid) return "";
  return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function extractSearchFields(order: WorkOrder): ParsedWorkOrderFields {
  try {
    const data = JSON.parse(order.formData) as Record<string, unknown>;
    const listToText = (value: unknown) =>
      Array.isArray(value)
        ? value
            .map((v) => String(v ?? "").trim())
            .filter(Boolean)
            .join(", ")
        : "";
    const detailPairs: string[] = [
      `Model: ${String(data.model ?? "").trim()}`,
      `Make: ${String(data.make ?? "").trim()}`,
      `Bus: ${String(data.bus ?? "").trim()}`,
      `Stair Chair Model: ${String(data.stairChairModel ?? "").trim()}`,
      `Stair Chair SN: ${String(data.stairChairSN ?? "").trim()}`,
      `Lock Notes: ${String(data.lockBarIssue ?? "").trim()}`,
    ].filter((x) => !x.endsWith(": "));

    return {
      dateIso: parseDateToIso(data.date),
      serial: String(data.sn ?? "").trim(),
      ambulance: String(data.ambulance ?? data.bus ?? "").trim(),
      notes: String(data.description ?? "").trim(),
      partsUsed: listToText(data.partsUsed),
      partsNeeded: listToText(data.partsNeeded),
      extraDetails: detailPairs.join(" | "),
    };
  } catch {
    return {
      dateIso: "",
      serial: "",
      ambulance: "",
      notes: "",
      partsUsed: "",
      partsNeeded: "",
      extraDetails: "",
    };
  }
}

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
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSerial, setFilterSerial] = useState("");
  const [filterAmbulance, setFilterAmbulance] = useState("");
  const [filterCustomer, setFilterCustomer] = useState<Customer | null>(null);

  // Technician: new work order flow
  const [workType, setWorkType] = useState<"cot" | "lift" | "">("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customersLoading, setCustomersLoading] = useState(false);
  const reportPrintRef = useRef<HTMLDivElement>(null);

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

  const filteredOrders = workOrders.filter((o) => {
    const parsed = extractSearchFields(o);
    if (filterStartDate && (!parsed.dateIso || parsed.dateIso < filterStartDate)) return false;
    if (filterEndDate && (!parsed.dateIso || parsed.dateIso > filterEndDate)) return false;
    if (filterCustomer && o.customerId !== filterCustomer.id) {
      return false;
    }
    if (filterSerial.trim()) {
      const q = filterSerial.trim().toLowerCase();
      if (!parsed.serial.toLowerCase().includes(q)) return false;
    }
    if (filterAmbulance.trim()) {
      const q = filterAmbulance.trim().toLowerCase();
      if (!parsed.ambulance.toLowerCase().includes(q)) return false;
    }

    return true;
  });

  const reportRows = filteredOrders.map((o) => {
    const parsed = extractSearchFields(o);
    return {
      id: o.id,
      date: parsed.dateIso || new Date(o.createdAt).toISOString().slice(0, 10),
      serial: parsed.serial || "—",
      ambulance: parsed.ambulance || "—",
      notes: parsed.notes || "—",
      partsUsed: parsed.partsUsed || "—",
      partsNeeded: parsed.partsNeeded || "—",
      details: parsed.extraDetails || "—",
      customer: o.customerName,
      technician: o.technicianName,
      type: o.type === "cot" ? "Cot Medik" : "Lift Medik",
    };
  });

  const formUrl =
    workType && selectedCustomer
      ? workType === "cot"
        ? `/repair-form?techName=${encodeURIComponent(userName)}&techId=${userId}&customerId=${selectedCustomer.id}&customerName=${encodeURIComponent(selectedCustomer.name)}&returnTo=${encodeURIComponent("/portal/work-orders")}`
        : `/lift-repair-form?techName=${encodeURIComponent(userName)}&techId=${userId}&customerId=${selectedCustomer.id}&customerName=${encodeURIComponent(selectedCustomer.name)}&returnTo=${encodeURIComponent("/portal/work-orders")}`
      : null;

  const ownerCustomerOptions = useMemo(() => {
    const customerMap = new Map<string, Customer>();
    for (const order of workOrders) {
      if (!order.customerId || !order.customerName) continue;
      customerMap.set(order.customerId, { id: order.customerId, name: order.customerName });
    }
    return Array.from(customerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [workOrders]);

  return (
    <div className="space-y-6">
      <div>
        <div className={role === "client" ? "flex flex-wrap items-start justify-between gap-3" : ""}>
          <div>
            <h1 className={role === "client" ? "text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl" : "text-2xl font-semibold text-zinc-900"}>
              Work Orders
            </h1>
            <p className={role === "client" ? "mt-2 max-w-2xl text-sm text-zinc-600" : "mt-2 text-zinc-500"}>
              {role === "owner"
                ? "View and filter all repair reports."
                : role === "client"
                  ? "Track service history, filter by date range, and generate customer-ready reports."
                  : "Start a new repair or view your completed work."}
            </p>
          </div>
        </div>
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

      <div className={role === "client" ? "rounded-md border border-zinc-200 bg-white shadow-sm" : "rounded-md border border-zinc-200 bg-white shadow-sm"}>
        <div className="flex flex-col gap-4 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className={role === "client" ? "text-base font-semibold tracking-tight text-zinc-900 sm:text-lg" : "font-medium text-zinc-900"}>
            {role === "owner" ? "All work orders" : "Your work orders"}
          </h2>
          {(role === "owner" || role === "client") && (
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {role === "owner" && (
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs text-zinc-600">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="cot">Cot Medik</SelectItem>
                      <SelectItem value="lift">Lift Medik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <Label className="text-xs text-zinc-600">Start date</Label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full min-w-0"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <Label className="text-xs text-zinc-600">End date</Label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full min-w-0"
                />
              </div>
              {role === "owner" && (
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs text-zinc-600">Customer</Label>
                  <Combobox
                    items={ownerCustomerOptions}
                    value={filterCustomer}
                    onValueChange={(v) => setFilterCustomer(v as Customer | null)}
                    itemToStringLabel={(c) => (c as Customer).name}
                    isItemEqualToValue={(a, b) => (a as Customer)?.id === (b as Customer)?.id}
                  >
                    <ComboboxInput
                      className="h-9 w-full min-w-0 text-sm"
                      placeholder="Select customer…"
                      showClear={!!filterCustomer}
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>No customer found.</ComboboxEmpty>
                      <ComboboxList>
                        {(item) => (
                          <ComboboxItem key={(item as Customer).id} value={item as Customer}>
                            {(item as Customer).name}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <Label className="text-xs text-zinc-600">Serial number</Label>
                <Input
                  placeholder="Serial number…"
                  value={filterSerial}
                  onChange={(e) => setFilterSerial(e.target.value)}
                  className="w-full min-w-0"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <Label className="text-xs text-zinc-600">Ambulance / Bus</Label>
                <Input
                  placeholder="Ambulance / Bus…"
                  value={filterAmbulance}
                  onChange={(e) => setFilterAmbulance(e.target.value)}
                  className="w-full min-w-0"
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFilterType("all");
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setFilterCustomer(null);
                  setFilterSerial("");
                  setFilterAmbulance("");
                }}
              >
                Clear filters
              </Button>
              <Button
                variant="outline"
                className={role === "client" ? "w-full border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700 hover:text-white" : "w-full"}
                onClick={() => {
                  if (reportPrintRef.current) {
                    printWorkOrderContent(reportPrintRef.current);
                  }
                }}
              >
                <Printer className="mr-2 size-4" />
                Print report
              </Button>
            </div>
          )}
        </div>
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No work orders yet.</div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {filteredOrders.map((o) => (
              <Link
                key={o.id}
                href={`/portal/work-orders/${o.id}`}
                className={
                  role === "client"
                    ? "flex items-center justify-between gap-3 border-l-2 border-transparent px-4 py-4 transition-colors hover:border-red-200 hover:bg-zinc-50"
                    : "flex items-center justify-between gap-3 border-l-2 border-transparent px-4 py-3 hover:border-zinc-300 hover:bg-zinc-50"
                }
              >
                <div>
                  <p className={role === "client" ? "text-base font-semibold text-zinc-900" : "text-sm font-medium text-zinc-900 sm:text-base"}>
                    {o.customerName} · {o.type === "cot" ? "Cot Medik" : "Lift Medik"}
                  </p>
                  <p className={role === "client" ? "mt-0.5 text-sm text-zinc-600" : "text-xs text-zinc-500 sm:text-sm"}>
                    {o.technicianName} · {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                  {role === "owner" && !o.hasFiles && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700">
                      <AlertTriangle className="size-3.5" />
                      No file attached
                    </p>
                  )}
                </div>
                <ChevronRight className="size-4 text-zinc-400" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {(role === "owner" || role === "client") && (
        <div className="rounded-md border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h3 className="font-medium text-zinc-900">Report table ({reportRows.length})</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Uses current filters. Print to export a paper/PDF report.
            </p>
          </div>
          <div>
            <style>{`
              .report-print-sheet-inline { display: none; }
              @media print {
                .report-screen { display: none !important; }
                .report-print-sheet-inline { display: block !important; }
              }
            `}</style>

            <div className="report-screen">
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[980px] w-full table-fixed text-sm">
                  <thead className="bg-zinc-50 text-left text-zinc-600">
                    <tr>
                      <th className="w-[11%] px-3 py-2 font-medium">Date</th>
                      <th className="w-[13%] px-3 py-2 font-medium">Serial #</th>
                      <th className="w-[15%] px-3 py-2 font-medium">Ambulance/Bus</th>
                      <th className="w-[16%] px-3 py-2 font-medium">Customer</th>
                      <th className="w-[15%] px-3 py-2 font-medium">Technician</th>
                      <th className="w-[10%] px-3 py-2 font-medium">Type</th>
                      <th className="w-[20%] px-3 py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row) => (
                      <tr key={row.id} className="border-t border-zinc-100 align-top">
                        <td className="px-3 py-2 text-zinc-700">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="px-3 py-2 wrap-break-word text-zinc-700">{row.serial}</td>
                        <td className="px-3 py-2 wrap-break-word text-zinc-700">{row.ambulance}</td>
                        <td className="px-3 py-2 wrap-break-word text-zinc-900">{row.customer}</td>
                        <td className="px-3 py-2 wrap-break-word text-zinc-700">{row.technician}</td>
                        <td className="px-3 py-2 text-zinc-700">{row.type}</td>
                        <td className="px-3 py-2 whitespace-pre-wrap wrap-break-word text-zinc-700">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2.5 p-3 md:hidden">
                {reportRows.length === 0 ? (
                  <div className="border border-zinc-200 p-4 text-center text-sm text-zinc-500">
                    No rows match current filters.
                  </div>
                ) : (
                  reportRows.map((row) => (
                    <div key={row.id} className="border border-zinc-200 bg-zinc-50/40 p-3">
                      <p className="text-sm font-semibold text-zinc-900 leading-tight">
                        {row.customer}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-600">
                        {new Date(row.date).toLocaleDateString()} · {row.type}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-zinc-700">
                        <p><span className="font-medium">Technician:</span> {row.technician}</p>
                        <p><span className="font-medium">Serial:</span> {row.serial}</p>
                        <p><span className="font-medium">Ambulance/Bus:</span> {row.ambulance}</p>
                      </div>
                      <p className="mt-2 border-t border-zinc-200 pt-2 text-xs text-zinc-700 whitespace-pre-wrap">
                        <span className="font-medium">Notes:</span> {row.notes}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="report-print-sheet-inline bg-white p-6 text-black">
              <div className="report-header mb-5 border-b-2 border-black pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/cotlogo.png"
                      alt="Cot Medik"
                      width={96}
                      height={22}
                      className="report-logo h-[22px] w-[96px] object-contain"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/liftlogo.jpeg"
                      alt="Lift Medik"
                      width={96}
                      height={22}
                      className="report-logo h-[22px] w-[96px] object-contain"
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tracking-wide">Work Order Report</p>
                    <p className="text-xs text-zinc-700">
                      Generated {new Date().toLocaleDateString()} · {reportRows.length} record(s)
                    </p>
                  </div>
                </div>
              </div>

              {reportRows.length === 0 ? (
                <p className="text-sm text-zinc-600">No rows match current filters.</p>
              ) : (
                <div className="space-y-4">
                  {reportRows.map((row) => (
                    <div
                      key={row.id}
                      className="break-inside-avoid border-[3px] border-black bg-white p-4 shadow-[0_2px_0_0_#000]"
                    >
                      <p className="border-b-2 border-black pb-2 text-sm font-bold uppercase tracking-[0.08em]">
                        {new Date(row.date).toLocaleDateString()} · {row.type}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed">
                        Customer: {row.customer} | Technician: {row.technician}
                      </p>
                      <p className="text-xs leading-relaxed">Serial: {row.serial} | Ambulance/Bus: {row.ambulance}</p>
                      <p className="mt-2 border-t border-black pt-2 text-xs leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold">Notes:</span> {row.notes}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold">Parts Used:</span> {row.partsUsed}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold">Parts Needed:</span> {row.partsNeeded}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold">Details:</span> {row.details}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(role === "owner" || role === "client") && (
        <div className="hidden">
          <div ref={reportPrintRef} data-work-order-print className="report-print-sheet bg-white p-6 text-black">
            <style>{`
              .report-box {
                border: 3px solid #000 !important;
                background: #fff !important;
                padding: 14px !important;
                margin-bottom: 14px !important;
                break-inside: avoid-page;
                page-break-inside: avoid;
              }
              .report-box-title {
                border-bottom: 2px solid #000 !important;
                padding-bottom: 8px !important;
                margin: 0 0 10px 0 !important;
                font-size: 13px !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.08em !important;
              }
              .report-line {
                margin: 4px 0 !important;
                font-size: 12px !important;
                line-height: 1.45 !important;
              }
              .report-block {
                margin-top: 8px !important;
                border-top: 1px solid #000 !important;
                padding-top: 8px !important;
                font-size: 12px !important;
                line-height: 1.45 !important;
                white-space: pre-wrap;
              }
              .report-label {
                font-weight: 800 !important;
              }
            `}</style>
            <div className="report-header mb-5 border-b-2 border-black pb-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/cotlogo.png"
                    alt="Cot Medik"
                    width={96}
                    height={22}
                    className="report-logo h-[22px] w-[96px] object-contain"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/liftlogo.jpeg"
                    alt="Lift Medik"
                    width={96}
                    height={22}
                    className="report-logo h-[22px] w-[96px] object-contain"
                  />
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tracking-wide">Work Order Report</p>
                  <p className="text-xs text-zinc-700">
                    Generated {new Date().toLocaleDateString()} · {reportRows.length} record(s)
                  </p>
                </div>
              </div>
            </div>

            {reportRows.length === 0 ? (
              <p className="text-sm text-zinc-600">No rows match current filters.</p>
            ) : (
              <div className="space-y-4">
                {reportRows.map((row) => (
                  <div key={row.id} className="report-box">
                    <p className="report-box-title">
                      {new Date(row.date).toLocaleDateString()} · {row.type}
                    </p>
                    <p className="report-line">
                      Customer: {row.customer} | Technician: {row.technician}
                    </p>
                    <p className="report-line">Serial: {row.serial} | Ambulance/Bus: {row.ambulance}</p>
                    <p className="report-block">
                      <span className="report-label">Notes:</span> {row.notes}
                    </p>
                    <p className="report-line whitespace-pre-wrap">
                      <span className="report-label">Parts Used:</span> {row.partsUsed}
                    </p>
                    <p className="report-line whitespace-pre-wrap">
                      <span className="report-label">Parts Needed:</span> {row.partsNeeded}
                    </p>
                    <p className="report-line whitespace-pre-wrap">
                      <span className="report-label">Details:</span> {row.details}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
