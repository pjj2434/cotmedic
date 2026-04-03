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
import {
  FileText,
  ChevronRight,
  Printer,
  AlertTriangle,
  LayoutList,
  Table2,
  FolderOpen,
  Settings,
  Check,
  Copy,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { printWorkOrderContent } from "@/lib/print-work-order";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportDateField } from "@/components/report-date-field";
import { useDisablePrintOnMobilePwa } from "@/hooks/use-mobile-pwa";

const CLIENT_CONTACT_EMAIL = "marcelo@cotmedik.com";

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
  adjusted: string;
  lockBarReplaced: string;
};

function formatYesNo(value: unknown): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

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

    const adjusted = formatYesNo(data.adjusted);
    const lockBarReplaced = formatYesNo(data.lockBarReplaced);
    if (adjusted !== "—") detailPairs.push(`Adjusted: ${adjusted}`);
    if (lockBarReplaced !== "—") detailPairs.push(`Lock bar replaced: ${lockBarReplaced}`);

    return {
      dateIso: parseDateToIso(data.date),
      serial: String(data.sn ?? "").trim(),
      ambulance: String(data.ambulance ?? data.bus ?? "").trim(),
      notes: String(data.description ?? "").trim(),
      partsUsed: listToText(data.partsUsed),
      partsNeeded: listToText(data.partsNeeded),
      extraDetails: detailPairs.join(" | "),
      adjusted,
      lockBarReplaced,
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
      adjusted: "—",
      lockBarReplaced: "—",
    };
  }
}

/** Split pipe-separated detail pairs across two lines for print/report readability. */
function splitDetailsForReport(details: string): { line1: string; line2: string } {
  if (!details || details === "—") return { line1: "—", line2: "" };
  const parts = details.split(" | ").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { line1: "—", line2: "" };
  if (parts.length === 1) return { line1: parts[0], line2: "" };
  const mid = Math.ceil(parts.length / 2);
  return {
    line1: parts.slice(0, mid).join(" | "),
    line2: parts.slice(mid).join(" | "),
  };
}

type WorkOrderReportRow = {
  id: string;
  date: string;
  serial: string;
  ambulance: string;
  notes: string;
  partsUsed: string;
  partsNeeded: string;
  details: string;
  adjusted: string;
  lockBarReplaced: string;
  customer: string;
  technician: string;
  type: string;
};

function ReportPrintHeader({ recordCount }: { recordCount: number }) {
  return (
    <div className="report-header mb-5 w-full border-b-2 border-black pb-3">
      <div className="flex w-full flex-col items-center gap-3 text-center">
        <div className="report-header-logos flex w-full items-center justify-center gap-4">
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
        <div className="w-full">
          <p className="text-lg font-bold tracking-wide">Work Order Report</p>
          <p className="text-xs text-zinc-700">
            Generated {new Date().toLocaleDateString()} · {recordCount} record(s)
          </p>
        </div>
      </div>
    </div>
  );
}

function ReportDataTable({ rows }: { rows: WorkOrderReportRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-600">No rows match current filters.</p>;
  }
  return (
    <table className="report-data-table w-full border-collapse text-left text-black">
      <colgroup>
        <col style={{ width: "7%" }} />
        <col style={{ width: "8%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "9%" }} />
        <col style={{ width: "9%" }} />
        <col style={{ width: "6%" }} />
        <col style={{ width: "6%" }} />
        <col style={{ width: "34%" }} />
      </colgroup>
      <thead>
        <tr>
          <th
            scope="col"
            className="border border-zinc-900 bg-zinc-900 px-1.5 py-2 text-[9px] font-bold tracking-wide text-white uppercase"
          >
            Date
          </th>
          <th
            scope="col"
            className="border border-zinc-900 bg-zinc-900 px-1.5 py-2 text-[9px] font-bold tracking-wide text-white uppercase"
          >
            Type
          </th>
          <th
            scope="col"
            className="border border-zinc-900 bg-zinc-900 px-1.5 py-2 text-[9px] font-bold tracking-wide text-white uppercase"
          >
            Customer
          </th>
          <th
            scope="col"
            className="border border-zinc-900 bg-zinc-900 px-1.5 py-2 text-[9px] font-bold tracking-wide text-white uppercase"
          >
            Technician
          </th>
          <th
            scope="col"
            className="border border-zinc-900 bg-zinc-900 px-1.5 py-2 text-[9px] font-bold tracking-wide text-white uppercase"
          >
            Serial
          </th>
          <th
            scope="col"
            className="border border-zinc-900 bg-zinc-900 px-1.5 py-2 text-[9px] font-bold tracking-wide text-white uppercase"
          >
            Amb/Bus
          </th>
          <th
            scope="col"
            className="border border-zinc-900 bg-zinc-900 px-1.5 py-2 text-center text-[9px] font-bold tracking-wide text-white uppercase"
          >
            Adj
          </th>
          <th
            scope="col"
            className="border border-zinc-900 bg-zinc-900 px-1.5 py-2 text-center text-[9px] font-bold tracking-wide text-white uppercase"
          >
            Lock
          </th>
          <th
            scope="col"
            className="border border-zinc-900 bg-zinc-900 px-1.5 py-2 text-[9px] font-bold tracking-wide text-white uppercase"
          >
            Work &amp; details
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={row.id}
            className={cn(i % 2 === 1 && "report-row-alt bg-zinc-100/80")}
          >
            <td className="border border-zinc-800 px-1.5 py-1.5 text-[9px] text-zinc-900">
              {new Date(row.date).toLocaleDateString()}
            </td>
            <td className="border border-zinc-800 px-1.5 py-1.5 text-[9px] text-zinc-900">{row.type}</td>
            <td className="border border-zinc-800 px-1.5 py-1.5 text-[9px] text-zinc-900 wrap-break-word">
              {row.customer}
            </td>
            <td className="border border-zinc-800 px-1.5 py-1.5 text-[9px] text-zinc-900 wrap-break-word">
              {row.technician}
            </td>
            <td className="border border-zinc-800 px-1.5 py-1.5 text-[9px] text-zinc-900 wrap-break-word">
              {row.serial}
            </td>
            <td className="border border-zinc-800 px-1.5 py-1.5 text-[9px] text-zinc-900 wrap-break-word">
              {row.ambulance}
            </td>
            <td className="cell-center border border-zinc-800 px-1 py-1.5 text-center text-[9px] text-zinc-900">
              {row.adjusted}
            </td>
            <td className="cell-center border border-zinc-800 px-1 py-1.5 text-center text-[9px] text-zinc-900">
              {row.lockBarReplaced}
            </td>
            <td className="cell-work border border-zinc-800 px-1.5 py-1.5 text-[9px] leading-snug text-zinc-900 wrap-break-word whitespace-pre-wrap">
              <p className="mb-1.5 last:mb-0">{row.notes}</p>
              {row.partsUsed !== "—" && (
                <p className="mb-1.5 last:mb-0">
                  <span className="cell-label font-semibold text-zinc-950">Parts used: </span>
                  {row.partsUsed}
                </p>
              )}
              {row.partsNeeded !== "—" && (
                <p className="mb-1.5 last:mb-0">
                  <span className="cell-label font-semibold text-zinc-950">Parts needed: </span>
                  {row.partsNeeded}
                </p>
              )}
              {row.details !== "—" && (
                <p className="mb-0">
                  <span className="cell-label font-semibold text-zinc-950">Details: </span>
                  {row.details}
                </p>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const CLIENT_WORK_ORDERS_PAGE_SIZE = 10;

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
  const [reportPrintFormat, setReportPrintFormat] = useState<"list" | "table">("list");
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [dialogPrintFormat, setDialogPrintFormat] = useState<"list" | "table">("list");
  const [printRunId, setPrintRunId] = useState(0);
  const [clientListLimit, setClientListLimit] = useState(CLIENT_WORK_ORDERS_PAGE_SIZE);
  const disablePrintOnMobilePwa = useDisablePrintOnMobilePwa();
  const [assistanceDialogOpen, setAssistanceDialogOpen] = useState(false);
  const [copiedContactEmail, setCopiedContactEmail] = useState(false);

  const copyClientContactEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CLIENT_CONTACT_EMAIL);
      setCopiedContactEmail(true);
      window.setTimeout(() => setCopiedContactEmail(false), 2000);
    } catch {
      setCopiedContactEmail(false);
    }
  }, []);

  useEffect(() => {
    if (printRunId === 0) return;
    const id = requestAnimationFrame(() => {
      if (reportPrintRef.current) {
        printWorkOrderContent(reportPrintRef.current);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [printRunId]);

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
    if (role !== "client") return;
    setClientListLimit(CLIENT_WORK_ORDERS_PAGE_SIZE);
  }, [
    role,
    workOrders,
    filterStartDate,
    filterEndDate,
    filterSerial,
    filterAmbulance,
  ]);

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

  const clientVisibleOrders =
    role === "client" ? filteredOrders.slice(0, clientListLimit) : filteredOrders;
  const clientHasMore =
    role === "client" && filteredOrders.length > clientListLimit;

  const reportRows: WorkOrderReportRow[] = filteredOrders.map((o) => {
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
      adjusted: o.type === "cot" ? parsed.adjusted : "—",
      lockBarReplaced: o.type === "cot" ? parsed.lockBarReplaced : "—",
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
      {role === "client" ? (
        <div className="overflow-hidden rounded-2xl border border-red-100/90 bg-linear-to-br from-white via-red-50/40 to-zinc-50 shadow-md shadow-zinc-200/30 ring-1 ring-red-100/50">
          <div className="flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-8 md:flex-row md:items-stretch md:gap-0 md:py-7">
            <div className="min-w-0 flex-1 md:pr-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-600">
                Your portal
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                Welcome back{userName?.trim() ? `, ${userName.trim()}` : ""}
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-600">
                Track service history, filter by date, and print reports whenever you need them.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 border-zinc-200/90 bg-white/90 shadow-sm hover:bg-white"
                >
                  <Link href="/portal/files">
                    <FolderOpen className="mr-2 size-4 text-red-600" />
                    Your files
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 border-zinc-200/90 bg-white/90 shadow-sm hover:bg-white"
                >
                  <Link href="/portal/settings/password">
                    <Settings className="mr-2 size-4 text-zinc-600" />
                    Account
                  </Link>
                </Button>
              </div>
            </div>
            <div className="flex shrink-0 flex-col justify-center border-t border-red-100/90 pt-5 md:w-60 md:border-t-0 md:border-l md:border-red-100/90 md:pl-8 md:pt-0 lg:w-64">
              <p className="text-sm font-semibold text-zinc-900">Need more assistance?</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                Reach Mark by email — copy the address or open your mail app.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 h-9 w-full border-red-200/80 bg-white/90 shadow-sm hover:bg-white sm:w-auto"
                onClick={() => setAssistanceDialogOpen(true)}
              >
                <Mail className="mr-2 size-4 text-red-600" />
                Contact us
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Work Orders</h1>
          <p className="mt-2 text-zinc-500">
            {role === "owner"
              ? "View and filter all repair reports."
              : "Start a new repair or view your completed work."}
          </p>
        </div>
      )}

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

      <div
        className={cn(
          "border bg-white shadow-sm",
          role === "client"
            ? "rounded-2xl border-zinc-200/80 shadow-md shadow-zinc-200/20 ring-1 ring-zinc-100/80"
            : "rounded-md border-zinc-200"
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between",
            role === "client" ? "border-zinc-100 bg-zinc-50/60 sm:px-5" : "border-zinc-200"
          )}
        >
          <h2 className={role === "client" ? "text-base font-semibold tracking-tight text-zinc-900 sm:text-lg" : "font-medium text-zinc-900"}>
            {role === "owner" ? "All work orders" : "Your work orders"}
          </h2>
          {(role === "owner" || role === "client") && (
            <div className="grid w-full grid-cols-1 items-stretch gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {role === "owner" && (
                <div className="flex min-w-0 flex-col justify-end gap-1">
                  <Label className="min-h-4.5 text-xs font-medium leading-none text-zinc-600">
                    Type
                  </Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger
                      size="sm"
                      className="h-7 min-h-7 w-full rounded-md border-zinc-200 text-xs"
                    >
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
              <div className="flex min-w-0 flex-col justify-end gap-1">
                <Label className="min-h-4.5 text-xs font-medium leading-none text-zinc-600">
                  Start date
                </Label>
                <ReportDateField
                  value={filterStartDate}
                  onChange={setFilterStartDate}
                  placeholder="Start date"
                />
              </div>
              <div className="flex min-w-0 flex-col justify-end gap-1">
                <Label className="min-h-4.5 text-xs font-medium leading-none text-zinc-600">
                  End date
                </Label>
                <ReportDateField
                  value={filterEndDate}
                  onChange={setFilterEndDate}
                  placeholder="End date"
                />
              </div>
              {role === "owner" && (
                <div className="flex min-w-0 flex-col justify-end gap-1">
                  <Label className="min-h-4.5 text-xs font-medium leading-none text-zinc-600">
                    Customer
                  </Label>
                  <Combobox
                    items={ownerCustomerOptions}
                    value={filterCustomer}
                    onValueChange={(v) => setFilterCustomer(v as Customer | null)}
                    itemToStringLabel={(c) => (c as Customer).name}
                    isItemEqualToValue={(a, b) => (a as Customer)?.id === (b as Customer)?.id}
                  >
                    <ComboboxInput
                      className="h-7 min-h-7 w-full rounded-md border-zinc-200 text-xs"
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
              <div className="flex min-w-0 flex-col justify-end gap-1">
                <Label className="min-h-4.5 text-xs font-medium leading-none text-zinc-600">
                  Serial number
                </Label>
                <Input
                  placeholder="Serial number…"
                  value={filterSerial}
                  onChange={(e) => setFilterSerial(e.target.value)}
                  className="h-7 min-h-7 w-full min-w-0 rounded-md border-zinc-200 px-2 py-0 text-xs"
                />
              </div>
              <div className="flex min-w-0 flex-col justify-end gap-1">
                <Label className="min-h-4.5 text-xs font-medium leading-none text-zinc-600">
                  Ambulance / Bus
                </Label>
                <Input
                  placeholder="Ambulance / Bus…"
                  value={filterAmbulance}
                  onChange={(e) => setFilterAmbulance(e.target.value)}
                  className="h-7 min-h-7 w-full min-w-0 rounded-md border-zinc-200 px-2 py-0 text-xs"
                />
              </div>
              <div className="flex min-w-0 flex-col justify-end gap-1">
                <span className="min-h-4.5" aria-hidden />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 min-h-7 w-full text-xs"
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
              </div>
              {!disablePrintOnMobilePwa && (
                <div className="flex min-w-0 flex-col justify-end gap-1">
                  <span className="min-h-4.5" aria-hidden />
                  <Button
                    variant="outline"
                    size="sm"
                    className={
                      role === "client"
                        ? "h-7 min-h-7 w-full border-red-600 bg-red-600 text-xs text-white hover:border-red-700 hover:bg-red-700 hover:text-white"
                        : "h-7 min-h-7 w-full text-xs"
                    }
                    onClick={() => {
                      setDialogPrintFormat(reportPrintFormat);
                      setPrintDialogOpen(true);
                    }}
                  >
                    <Printer className="mr-1.5 size-3.5" />
                    Print report
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        {loading ? (
          <div
            className={cn(
              "p-8 text-center text-zinc-500",
              role === "client" && "py-12 text-sm"
            )}
          >
            Loading…
          </div>
        ) : filteredOrders.length === 0 ? (
          role === "client" ? (
            <div className="p-6 sm:p-8">
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-10 text-center">
                <FileText className="mx-auto size-11 text-red-200" strokeWidth={1.25} />
                <p className="mt-4 text-base font-semibold text-zinc-800">No work orders yet</p>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">
                  When your team completes a repair report, it will appear in this list for you to review.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-500">No work orders yet.</div>
          )
        ) : (
          <>
            <div
              className={cn(
                role === "client"
                  ? "space-y-2 p-3 sm:space-y-2.5 sm:p-4"
                  : "divide-y divide-zinc-200"
              )}
            >
              {clientVisibleOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/portal/work-orders/${o.id}`}
                  className={cn(
                    "flex items-center justify-between gap-3 transition-colors",
                    role === "client"
                      ? "group rounded-xl border border-zinc-100 bg-white px-3 py-3.5 shadow-sm hover:border-red-100 hover:bg-red-50/35 hover:shadow-md sm:px-4"
                      : "border-l-2 border-transparent px-4 py-3 hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {role === "client" && (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100/90 text-red-700 shadow-inner shadow-red-200/20">
                        <FileText className="size-5" strokeWidth={2} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p
                        className={cn(
                          role === "client"
                            ? "text-base font-semibold tracking-tight text-zinc-900"
                            : "text-sm font-medium text-zinc-900 sm:text-base"
                        )}
                      >
                        {o.customerName} · {o.type === "cot" ? "Cot Medik" : "Lift Medik"}
                      </p>
                      <p
                        className={cn(
                          role === "client"
                            ? "mt-0.5 text-sm text-zinc-600"
                            : "text-xs text-zinc-500 sm:text-sm"
                        )}
                      >
                        {o.technicianName} · {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                      {role === "owner" && !o.hasFiles && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700">
                          <AlertTriangle className="size-3.5" />
                          No file attached
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 text-zinc-400",
                      role === "client" && "transition-transform group-hover:translate-x-0.5 group-hover:text-red-500"
                    )}
                  />
                </Link>
              ))}
            </div>
            {clientHasMore && (
              <div className="border-t border-zinc-200 px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full text-xs"
                  onClick={() =>
                    setClientListLimit((n) =>
                      Math.min(n + CLIENT_WORK_ORDERS_PAGE_SIZE, filteredOrders.length)
                    )
                  }
                >
                  Show more ({filteredOrders.length - clientListLimit} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {(role === "owner" || role === "client") && (
        <div
          className={cn(
            "border border-zinc-200 bg-white shadow-sm",
            role === "client"
              ? "rounded-2xl border-zinc-200/80 shadow-md shadow-zinc-200/20 ring-1 ring-zinc-100/80"
              : "rounded-md"
          )}
        >
          <div
            className={cn(
              "border-b px-4 py-3",
              role === "client" ? "border-zinc-100 bg-zinc-50/60 sm:px-5" : "border-zinc-200"
            )}
          >
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
                .report-print-sheet-inline .report-header {
                  width: 100% !important;
                  text-align: center !important;
                  display: flex !important;
                  flex-direction: column !important;
                  align-items: center !important;
                }
                .report-print-sheet-inline .report-header-logos {
                  display: flex !important;
                  justify-content: center !important;
                  align-items: center !important;
                  width: 100% !important;
                  gap: 16px !important;
                }
                .report-print-sheet-inline .report-data-table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  table-layout: fixed !important;
                  font-size: 8.5px !important;
                  line-height: 1.35 !important;
                }
                .report-print-sheet-inline .report-data-table th,
                .report-print-sheet-inline .report-data-table td {
                  border: 1px solid #000 !important;
                  padding: 4px 5px !important;
                  vertical-align: top !important;
                  word-wrap: break-word !important;
                }
                .report-print-sheet-inline .report-data-table thead th {
                  background: #18181b !important;
                  color: #fff !important;
                  font-weight: 700 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .report-print-sheet-inline .report-data-table .report-row-alt td {
                  background: #f4f4f5 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            `}</style>

            <div className="report-screen">
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[1120px] w-full table-fixed text-sm">
                  <thead className="bg-zinc-50 text-left text-zinc-600">
                    <tr>
                      <th className="w-[9%] px-3 py-2 font-medium">Date</th>
                      <th className="w-[11%] px-3 py-2 font-medium">Serial #</th>
                      <th className="w-[12%] px-3 py-2 font-medium">Ambulance/Bus</th>
                      <th className="w-[14%] px-3 py-2 font-medium">Customer</th>
                      <th className="w-[12%] px-3 py-2 font-medium">Technician</th>
                      <th className="w-[9%] px-3 py-2 font-medium">Type</th>
                      <th className="w-[7%] px-2 py-2 font-medium">Adjusted</th>
                      <th className="w-[9%] px-2 py-2 font-medium">Lock bar</th>
                      <th className="w-[17%] px-3 py-2 font-medium">Notes</th>
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
                        <td className="px-2 py-2 text-center text-zinc-700">{row.adjusted}</td>
                        <td className="px-2 py-2 text-center text-zinc-700">{row.lockBarReplaced}</td>
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
                        {row.type === "Cot Medik" && (
                          <>
                            <p><span className="font-medium">Adjusted:</span> {row.adjusted}</p>
                            <p><span className="font-medium">Lock bar replaced:</span> {row.lockBarReplaced}</p>
                          </>
                        )}
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
              <ReportPrintHeader recordCount={reportRows.length} />
              {reportPrintFormat === "table" ? (
                <div className="mt-1">
                  <ReportDataTable rows={reportRows} />
                </div>
              ) : reportRows.length === 0 ? (
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
                      {row.type === "Cot Medik" && (
                        <p className="mt-1 text-xs leading-relaxed">
                          Adjusted: {row.adjusted} | Lock bar replaced: {row.lockBarReplaced}
                        </p>
                      )}
                      <p className="mt-2 border-t border-black pt-2 text-xs leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold">Notes:</span> {row.notes}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold">Parts Used:</span> {row.partsUsed}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold">Parts Needed:</span> {row.partsNeeded}
                      </p>
                      {(() => {
                        const { line1, line2 } = splitDetailsForReport(row.details);
                        return (
                          <div className="mt-1 text-xs leading-relaxed">
                            <p className="font-bold">Details:</p>
                            <p className="whitespace-pre-wrap">{line1}</p>
                            {line2 ? <p className="whitespace-pre-wrap">{line2}</p> : null}
                          </div>
                        );
                      })()}
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
          <div ref={reportPrintRef} data-work-order-print>
            <div className="report-print-sheet bg-white p-6 text-black">
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
              .report-header {
                width: 100% !important;
                text-align: center !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
              }
              .report-header-logos {
                display: flex !important;
                flex-direction: row !important;
                justify-content: center !important;
                align-items: center !important;
                width: 100% !important;
                gap: 16px !important;
              }
              .report-data-table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                font-size: 8.5px !important;
                line-height: 1.35 !important;
              }
              .report-data-table th,
              .report-data-table td {
                border: 1px solid #000 !important;
                padding: 4px 5px !important;
                vertical-align: top !important;
                word-wrap: break-word !important;
              }
              .report-data-table thead th {
                background: #18181b !important;
                color: #fff !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.04em !important;
              }
              .report-data-table .report-row-alt td {
                background: #f4f4f5 !important;
              }
              .report-data-table .cell-center { text-align: center !important; }
              .report-data-table .cell-work p { margin: 0 0 3px 0 !important; }
              .report-data-table .cell-work p:last-child { margin-bottom: 0 !important; }
              .report-data-table .cell-label { font-weight: 700 !important; }
            `}</style>
              <ReportPrintHeader recordCount={reportRows.length} />
              {reportPrintFormat === "table" ? (
                <div className="mt-1">
                  <ReportDataTable rows={reportRows} />
                </div>
              ) : reportRows.length === 0 ? (
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
                      {row.type === "Cot Medik" && (
                        <p className="report-line">
                          Adjusted: {row.adjusted} | Lock bar replaced: {row.lockBarReplaced}
                        </p>
                      )}
                      <p className="report-block">
                        <span className="report-label">Notes:</span> {row.notes}
                      </p>
                      <p className="report-line whitespace-pre-wrap">
                        <span className="report-label">Parts Used:</span> {row.partsUsed}
                      </p>
                      <p className="report-line whitespace-pre-wrap">
                        <span className="report-label">Parts Needed:</span> {row.partsNeeded}
                      </p>
                      {(() => {
                        const { line1, line2 } = splitDetailsForReport(row.details);
                        return (
                          <>
                            <p className="report-line">
                              <span className="report-label">Details:</span>
                            </p>
                            <p className="report-line whitespace-pre-wrap">{line1}</p>
                            {line2 ? <p className="report-line whitespace-pre-wrap">{line2}</p> : null}
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(role === "owner" || role === "client") && (
        <Dialog
          open={printDialogOpen}
          onOpenChange={(open) => {
            setPrintDialogOpen(open);
            if (open) setDialogPrintFormat(reportPrintFormat);
          }}
        >
          <DialogContent
            className="gap-0 overflow-hidden border-zinc-200/90 bg-linear-to-b from-white to-zinc-50/95 p-0 shadow-2xl sm:max-w-[440px]"
            showCloseButton
            closeButtonClassName="top-3.5 right-3.5 text-zinc-500 hover:text-zinc-900"
          >
            <div className="border-b border-zinc-200/80 bg-white px-5 pb-4 pt-5">
              <DialogHeader className="gap-1.5">
                <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900">
                  Print work order report
                </DialogTitle>
                <DialogDescription className="text-sm text-zinc-600">
                  Choose a layout. Current filters apply ({reportRows.length} record
                  {reportRows.length === 1 ? "" : "s"}).
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-3 px-5 py-4" role="radiogroup" aria-label="Report layout">
              <button
                type="button"
                role="radio"
                aria-checked={dialogPrintFormat === "list"}
                onClick={() => setDialogPrintFormat("list")}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2",
                  dialogPrintFormat === "list"
                    ? "border-red-500 bg-red-50/40 shadow-sm"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/90"
                )}
              >
                <span
                  className={cn(
                    "mt-1 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    dialogPrintFormat === "list"
                      ? "border-red-600 bg-red-600"
                      : "border-zinc-300 bg-white"
                  )}
                  aria-hidden
                >
                  {dialogPrintFormat === "list" ? (
                    <span className="size-2 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-inner">
                  <LayoutList className="size-5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-zinc-900">List view</span>
                  <span className="mt-0.5 block text-sm leading-snug text-zinc-600">
                    One card per work order — detailed blocks, best for long notes and filing.
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={dialogPrintFormat === "table"}
                onClick={() => setDialogPrintFormat("table")}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2",
                  dialogPrintFormat === "table"
                    ? "border-red-500 bg-red-50/40 shadow-sm"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/90"
                )}
              >
                <span
                  className={cn(
                    "mt-1 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    dialogPrintFormat === "table"
                      ? "border-red-600 bg-red-600"
                      : "border-zinc-300 bg-white"
                  )}
                  aria-hidden
                >
                  {dialogPrintFormat === "table" ? (
                    <span className="size-2 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-inner">
                  <Table2 className="size-5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-zinc-900">Table view</span>
                  <span className="mt-0.5 block text-sm leading-snug text-zinc-600">
                    Compact grid with a dark header and striped rows — great for scanning many orders.
                  </span>
                </span>
              </button>
            </div>
            <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t border-zinc-200/80 bg-white px-6 pb-6 pt-4 sm:justify-end sm:gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setPrintDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className={
                  role === "client"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-zinc-900 text-white hover:bg-zinc-800"
                }
                onClick={() => {
                  setReportPrintFormat(dialogPrintFormat);
                  setPrintDialogOpen(false);
                  setPrintRunId((n) => n + 1);
                }}
              >
                <Printer className="mr-2 size-4" />
                Print
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {role === "client" && (
        <Dialog
          open={assistanceDialogOpen}
          onOpenChange={(open) => {
            setAssistanceDialogOpen(open);
            if (!open) setCopiedContactEmail(false);
          }}
        >
          <DialogContent
            className="border-zinc-200/90 sm:max-w-md"
            showCloseButton
            closeButtonClassName="text-zinc-500 hover:text-zinc-900"
          >
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900">
                Need to contact us?
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-600">
                Reach Mark at the email below. Copy it or open your mail app.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <Input
                readOnly
                value={CLIENT_CONTACT_EMAIL}
                aria-label="Contact email address"
                className="font-mono text-sm text-zinc-900"
                onFocus={(e) => e.target.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2 sm:w-auto"
                onClick={copyClientContactEmail}
              >
                {copiedContactEmail ? (
                  <>
                    <Check className="size-4 text-green-600" />
                    Copied to clipboard
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy email
                  </>
                )}
              </Button>
            </div>
            <DialogFooter className="mx-0 mb-0 flex-col gap-2 border-t border-zinc-200/80 bg-transparent px-0 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setAssistanceDialogOpen(false)}>
                Close
              </Button>
              <Button type="button" size="sm" className="bg-red-600 hover:bg-red-700" asChild>
                <a href={`mailto:${CLIENT_CONTACT_EMAIL}`}>
                  <Mail className="mr-2 size-4" />
                  Open email app
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
