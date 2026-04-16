"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type DragEvent } from "react";
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
  Settings,
  Check,
  Copy,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { printWorkOrderContent } from "@/lib/print-work-order";
import { cn } from "@/lib/utils";
import { isLocationPortalRole } from "@/lib/portal-roles";
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
import { uploadFiles } from "@/lib/uploadthing";
import { toast } from "sonner";

const CLIENT_CONTACT_EMAIL = "marcelo@cotmedik.com";

const WORK_ORDERS_LIST_FILTERS_STORAGE_PREFIX = "cotmedic-portal-work-orders-list-filters:";

const FILE_FILTER_VALUES = ["all", "has", "none"] as const;
type FileFilterValue = (typeof FILE_FILTER_VALUES)[number];

type PersistedWorkOrderListFilters = {
  filterType: string;
  filterFiles: string;
  filterStartDate: string;
  filterEndDate: string;
  filterSerial: string;
  filterAmbulance: string;
  filterCustomer: { id: string; name: string } | null;
};

type Customer = { id: string; name: string; customerType?: string };
type Technician = { id: string; name: string };
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

function ReportDataTable({
  rows,
  density = "print",
}: {
  rows: WorkOrderReportRow[];
  density?: "print" | "screen";
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-600">No rows match current filters.</p>;
  }
  if (density === "print") {
    return (
      <div className="report-grid-table text-black">
        <div className="report-grid-head">
          <div>Date</div>
          <div>Technician</div>
          <div>Ambulance / Bus</div>
          <div>Description</div>
          <div>Parts used</div>
        </div>
        {rows.map((row, i) => (
          <div key={row.id} className={cn("report-grid-row", i % 2 === 1 && "report-row-alt")}>
            <div className="report-grid-cell">{new Date(row.date).toLocaleDateString()}</div>
            <div className="report-grid-cell">{row.technician}</div>
            <div className="report-grid-cell">{row.ambulance}</div>
            <div className="report-grid-cell whitespace-pre-wrap">{row.notes}</div>
            <div className="report-grid-cell whitespace-pre-wrap">{row.partsUsed}</div>
          </div>
        ))}
      </div>
    );
  }
  const cell =
    density === "screen" ? "text-sm px-3 py-2.5" : "text-[11px] px-2 py-2 leading-snug";
  const head =
    density === "screen" ? "text-sm px-3 py-3" : "text-[11px] px-2 py-2.5 leading-tight";
  return (
    <table className="report-data-table w-full border-collapse text-left text-black">
      <colgroup>
        <col style={{ width: "12%" }} />
        <col style={{ width: "16%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "26%" }} />
        <col style={{ width: "34%" }} />
      </colgroup>
      <thead>
        <tr>
          <th
            scope="col"
            className={cn(
              "border border-zinc-900 bg-zinc-900 font-bold tracking-wide text-white uppercase",
              head
            )}
          >
            Date
          </th>
          <th
            scope="col"
            className={cn(
              "border border-zinc-900 bg-zinc-900 font-bold tracking-wide text-white uppercase",
              head
            )}
          >
            Technician
          </th>
          <th
            scope="col"
            className={cn(
              "border border-zinc-900 bg-zinc-900 font-bold tracking-wide text-white uppercase",
              head
            )}
          >
            Ambulance / Bus
          </th>
          <th
            scope="col"
            className={cn(
              "border border-zinc-900 bg-zinc-900 font-bold tracking-wide text-white uppercase",
              head
            )}
          >
            Description
          </th>
          <th
            scope="col"
            className={cn(
              "border border-zinc-900 bg-zinc-900 font-bold tracking-wide text-white uppercase",
              head
            )}
          >
            Parts used
          </th>
        </tr>
      </thead>
      {rows.map((row, i) => (
        <tbody key={row.id} className="report-row-group break-inside-avoid">
          <tr className={cn(i % 2 === 1 && "report-row-alt bg-zinc-100/80")}>
            <td
              className={cn(
                "border border-zinc-800 text-zinc-900",
                cell
              )}
            >
              {new Date(row.date).toLocaleDateString()}
            </td>
            <td className={cn("border border-zinc-800 text-zinc-900 wrap-break-word", cell)}>
              {row.technician}
            </td>
            <td className={cn("border border-zinc-800 text-zinc-900 wrap-break-word", cell)}>
              {row.ambulance}
            </td>
            <td
              className={cn(
                "border border-zinc-800 leading-snug text-zinc-900 wrap-break-word whitespace-pre-wrap",
                cell
              )}
            >
              {row.notes}
            </td>
            <td
              className={cn(
                "border border-zinc-800 leading-snug text-zinc-900 wrap-break-word whitespace-pre-wrap",
                cell
              )}
            >
              {row.partsUsed}
            </td>
          </tr>
        </tbody>
      ))}
    </table>
  );
}

function ReportPrintList({
  rows,
  density,
}: {
  rows: WorkOrderReportRow[];
  density: "print" | "screen";
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-600">No rows match current filters.</p>;
  }
  const screen = density === "screen";
  return (
    <div className={cn("space-y-3", screen && "space-y-4")}>
      {rows.map((row) => {
        const { line1, line2 } = splitDetailsForReport(row.details);
        return (
          <div
            key={row.id}
            className={cn(
              screen
                ? "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
                : "report-list-card break-inside-avoid border-2 border-black bg-white"
            )}
          >
            <p
              className={cn(
                "font-bold uppercase tracking-wide text-zinc-900",
                screen ? "border-b border-zinc-200 pb-2 text-base sm:text-lg" : "report-list-card-title"
              )}
            >
              {new Date(row.date).toLocaleDateString()} · {row.type}
            </p>
            <div
              className={cn(
                "space-y-1 text-zinc-800",
                screen ? "mt-3 text-sm sm:text-base leading-relaxed" : "report-list-card-body mt-2 space-y-1"
              )}
            >
              <p>
                <span className={cn("font-semibold text-zinc-900", screen && "text-zinc-950")}>
                  Technician:{" "}
                </span>
                {row.technician}
              </p>
              <p>
                <span className={cn("font-semibold text-zinc-900", screen && "text-zinc-950")}>
                  Ambulance / Bus:{" "}
                </span>
                {row.ambulance}
              </p>
              <p>
                <span className={cn("font-semibold text-zinc-900", screen && "text-zinc-950")}>
                  Parts used:{" "}
                </span>
                <span className="whitespace-pre-wrap">{row.partsUsed}</span>
              </p>
            </div>
            <div
              className={cn(
                "text-zinc-700",
                screen
                  ? "mt-4 space-y-2 border-t border-zinc-200 pt-4 text-sm sm:text-[15px] leading-relaxed"
                  : "report-list-card-extra mt-2 space-y-1 border-t border-black pt-2"
              )}
            >
              <p>
                <span className="font-semibold text-zinc-900">Customer:</span> {row.customer}
              </p>
              <p>
                <span className="font-semibold text-zinc-900">Serial:</span> {row.serial}
              </p>
              {row.type === "Cot Medik" && (
                <p>
                  <span className="font-semibold text-zinc-900">Adjusted / Lock bar:</span>{" "}
                  {row.adjusted} / {row.lockBarReplaced}
                </p>
              )}
              <p className="whitespace-pre-wrap">
                <span className="font-semibold text-zinc-900">Notes:</span> {row.notes}
              </p>
              {row.partsNeeded !== "—" && (
                <p className="whitespace-pre-wrap">
                  <span className="font-semibold text-zinc-900">Parts needed:</span> {row.partsNeeded}
                </p>
              )}
              {row.details !== "—" && (
                <div className="whitespace-pre-wrap">
                  <p className="font-semibold text-zinc-900">Details:</p>
                  <p>{line1}</p>
                  {line2 ? <p>{line2}</p> : null}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportFormatToggle({
  value,
  onChange,
  className,
}: {
  value: "list" | "table";
  onChange: (v: "list" | "table") => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-zinc-200 bg-zinc-50/80 p-0.5 shadow-sm",
        className
      )}
      role="group"
      aria-label="Report layout"
    >
      <button
        type="button"
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
          value === "table"
            ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
            : "text-zinc-600 hover:text-zinc-900"
        )}
      >
        <Table2 className="size-3.5 sm:size-4" strokeWidth={2} />
        Table
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
          value === "list"
            ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
            : "text-zinc-600 hover:text-zinc-900"
        )}
      >
        <LayoutList className="size-3.5 sm:size-4" strokeWidth={2} />
        List
      </button>
    </div>
  );
}

function WorkOrderListRowWithOptionalFileDrop({
  order: o,
  clientLike,
  showOwnerStyleFilters,
  fileDropEnabled,
  onFilesUploaded,
}: {
  order: WorkOrder;
  clientLike: boolean;
  showOwnerStyleFilters: boolean;
  fileDropEnabled: boolean;
  onFilesUploaded: () => void;
}) {
  const [fileDragOver, setFileDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!fileDropEnabled) return;
      if (![...e.dataTransfer.types].includes("Files")) return;
      e.preventDefault();
      setFileDragOver(true);
    },
    [fileDropEnabled]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!fileDropEnabled) return;
      const related = e.relatedTarget as Node | null;
      if (related && e.currentTarget.contains(related)) return;
      setFileDragOver(false);
    },
    [fileDropEnabled]
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!fileDropEnabled) return;
      if (![...e.dataTransfer.types].includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    [fileDropEnabled]
  );

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      if (!fileDropEnabled) return;
      setFileDragOver(false);
      const files = [...e.dataTransfer.files];
      if (files.length === 0) return;
      e.preventDefault();
      setUploadingFiles(true);
      try {
        await uploadFiles("workOrderFileUploader", {
          files,
          input: { workOrderId: o.id },
        });
        toast.success(files.length === 1 ? "File attached" : "Files attached");
        onFilesUploaded();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.error(message);
      } finally {
        setUploadingFiles(false);
      }
    },
    [fileDropEnabled, o.id, onFilesUploaded]
  );

  const linkClass = cn(
    "flex items-center justify-between gap-3 transition-colors",
    clientLike
      ? "group rounded-xl border border-zinc-100 bg-white px-3 py-3.5 shadow-sm hover:border-red-100 hover:bg-red-50/35 hover:shadow-md sm:px-4"
      : "border-l-2 border-transparent px-4 py-3 hover:border-zinc-300 hover:bg-zinc-50"
  );

  const linkInner = (
    <Link href={`/portal/work-orders/${o.id}`} className={linkClass}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {clientLike && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100/90 text-red-700 shadow-inner shadow-red-200/20">
            <FileText className="size-5" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0">
          <p
            className={cn(
              clientLike
                ? "text-base font-semibold tracking-tight text-zinc-900"
                : "text-sm font-medium text-zinc-900 sm:text-base"
            )}
          >
            {o.customerName} · {o.type === "cot" ? "Cot Medik" : "Lift Medik"}
          </p>
          <p
            className={cn(
              clientLike ? "mt-0.5 text-sm text-zinc-600" : "text-xs text-zinc-500 sm:text-sm"
            )}
          >
            {o.technicianName} · {new Date(o.createdAt).toLocaleDateString()}
          </p>
          {showOwnerStyleFilters && !o.hasFiles && (
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
          clientLike && "transition-transform group-hover:translate-x-0.5 group-hover:text-red-500"
        )}
      />
    </Link>
  );

  if (!fileDropEnabled) {
    return linkInner;
  }

  return (
    <div
      className={cn(
        "relative",
        fileDragOver && (clientLike ? "rounded-xl ring-2 ring-red-500/70" : "rounded-sm ring-2 ring-red-500/70")
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {linkInner}
      {uploadingFiles && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/75 text-sm font-medium text-zinc-800 backdrop-blur-[1px]",
            clientLike ? "rounded-xl" : "rounded-sm"
          )}
        >
          Uploading…
        </div>
      )}
    </div>
  );
}

const CLIENT_WORK_ORDERS_PAGE_SIZE = 20;
const OWNER_WORK_ORDERS_PAGE_SIZE = 20;

export function WorkOrdersClient({
  role,
  userName,
  userId,
}: {
  role: string;
  userName: string;
  userId: string;
}) {
  const clientLike = isLocationPortalRole(role);
  const showOwnerStyleFilters = role === "owner" || role === "administrator";
  const canAttachFilesOnList =
    (role === "owner" || role === "technician") && !clientLike;
  const shouldPersistListFilters = role !== "technician";
  const listFiltersStorageKey = `${WORK_ORDERS_LIST_FILTERS_STORAGE_PREFIX}${userId}`;

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterFiles, setFilterFiles] = useState<FileFilterValue>("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSerial, setFilterSerial] = useState("");
  const [filterAmbulance, setFilterAmbulance] = useState("");
  const [filterCustomer, setFilterCustomer] = useState<Customer | null>(null);

  // Technician: new work order flow
  const [workType, setWorkType] = useState<"cot" | "lift" | "">("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [techniciansLoading, setTechniciansLoading] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [customersLoading, setCustomersLoading] = useState(false);
  const reportPrintRef = useRef<HTMLDivElement>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [reportPrintFormat, setReportPrintFormat] = useState<"list" | "table">("table");
  const [dialogPrintFormat, setDialogPrintFormat] = useState<"list" | "table">("table");
  const [printRunId, setPrintRunId] = useState(0);
  const [clientListLimit, setClientListLimit] = useState(CLIENT_WORK_ORDERS_PAGE_SIZE);
  const [ownerListLimit, setOwnerListLimit] = useState(OWNER_WORK_ORDERS_PAGE_SIZE);
  const disablePrintOnMobilePwa = useDisablePrintOnMobilePwa();
  const [assistanceDialogOpen, setAssistanceDialogOpen] = useState(false);
  const [copiedContactEmail, setCopiedContactEmail] = useState(false);
  const [listFiltersHydrated, setListFiltersHydrated] = useState(!shouldPersistListFilters);

  useEffect(() => {
    if (!shouldPersistListFilters) return;
    try {
      const raw = sessionStorage.getItem(listFiltersStorageKey);
      if (!raw) {
        setListFiltersHydrated(true);
        return;
      }
      const p = JSON.parse(raw) as Partial<PersistedWorkOrderListFilters>;
      if (typeof p.filterType === "string") setFilterType(p.filterType);
      if (typeof p.filterFiles === "string" && FILE_FILTER_VALUES.includes(p.filterFiles as FileFilterValue)) {
        setFilterFiles(p.filterFiles as FileFilterValue);
      }
      if (typeof p.filterStartDate === "string") setFilterStartDate(p.filterStartDate);
      if (typeof p.filterEndDate === "string") setFilterEndDate(p.filterEndDate);
      if (typeof p.filterSerial === "string") setFilterSerial(p.filterSerial);
      if (typeof p.filterAmbulance === "string") setFilterAmbulance(p.filterAmbulance);
      if (p.filterCustomer === null) setFilterCustomer(null);
      else if (
        p.filterCustomer &&
        typeof p.filterCustomer.id === "string" &&
        typeof p.filterCustomer.name === "string"
      ) {
        setFilterCustomer({ id: p.filterCustomer.id, name: p.filterCustomer.name });
      }
    } catch {
      /* ignore corrupt storage */
    }
    setListFiltersHydrated(true);
  }, [shouldPersistListFilters, listFiltersStorageKey]);

  useEffect(() => {
    if (!shouldPersistListFilters || !listFiltersHydrated) return;
    const payload: PersistedWorkOrderListFilters = {
      filterType,
      filterFiles,
      filterStartDate,
      filterEndDate,
      filterSerial,
      filterAmbulance,
      filterCustomer: filterCustomer
        ? { id: filterCustomer.id, name: filterCustomer.name }
        : null,
    };
    try {
      sessionStorage.setItem(listFiltersStorageKey, JSON.stringify(payload));
    } catch {
      /* quota / private mode */
    }
  }, [
    shouldPersistListFilters,
    listFiltersHydrated,
    listFiltersStorageKey,
    filterType,
    filterFiles,
    filterStartDate,
    filterEndDate,
    filterSerial,
    filterAmbulance,
    filterCustomer,
  ]);

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

  /** After a successful row upload, set `hasFiles` locally so filters (e.g. “no file”) apply without refetching. */
  const markWorkOrderHasFiles = useCallback((workOrderId: string) => {
    setWorkOrders((prev) =>
      prev.map((order) =>
        order.id === workOrderId ? { ...order, hasFiles: true } : order
      )
    );
  }, []);

  const fetchCustomers = useCallback(async (type: "cot" | "lift") => {
    setCustomersLoading(true);
    try {
      const res = await fetch(`/api/customers?type=${type}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = (await res.json()) as { customers?: Customer[] };
      setCustomers(data.customers ?? []);
    } catch {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  const fetchTechnicians = useCallback(async () => {
    if (role !== "owner") return;
    setTechniciansLoading(true);
    try {
      const res = await fetch("/api/technicians");
      if (!res.ok) throw new Error("Failed to fetch technicians");
      const data = (await res.json()) as { technicians?: { id: string; name: string }[] };
      const users = data.technicians ?? [];
      setTechnicians(
        users
          .map((u) => ({ id: u.id, name: String(u.name ?? "").trim() || "Unnamed technician" }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch {
      setTechnicians([]);
    } finally {
      setTechniciansLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  useEffect(() => {
    if (workType) fetchCustomers(workType);
    else setCustomers([]);
    setSelectedCustomer(null);
  }, [workType, fetchCustomers]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  useEffect(() => {
    if (!isLocationPortalRole(role)) return;
    setClientListLimit(CLIENT_WORK_ORDERS_PAGE_SIZE);
  }, [
    role,
    workOrders,
    filterStartDate,
    filterEndDate,
    filterFiles,
    filterSerial,
    filterAmbulance,
  ]);

  useEffect(() => {
    if (role !== "owner" && role !== "administrator") return;
    setOwnerListLimit(OWNER_WORK_ORDERS_PAGE_SIZE);
  }, [
    role,
    workOrders,
    filterType,
    filterFiles,
    filterStartDate,
    filterEndDate,
    filterCustomer,
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
    if (filterFiles === "has" && !o.hasFiles) return false;
    if (filterFiles === "none" && o.hasFiles) return false;

    return true;
  });

  const ownerLike = role === "owner" || role === "administrator";
  const visibleOrders = clientLike
    ? filteredOrders.slice(0, clientListLimit)
    : ownerLike
      ? filteredOrders.slice(0, ownerListLimit)
      : filteredOrders;
  const hasMore = clientLike
    ? filteredOrders.length > clientListLimit
    : ownerLike && filteredOrders.length > ownerListLimit;

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

  const activeTechnician = role === "owner" ? selectedTechnician : { id: userId, name: userName };
  const formUrl =
    workType && selectedCustomer && activeTechnician
      ? workType === "cot"
        ? `/repair-form?techName=${encodeURIComponent(activeTechnician.name)}&techId=${activeTechnician.id}&customerId=${selectedCustomer.id}&customerName=${encodeURIComponent(selectedCustomer.name)}&returnTo=${encodeURIComponent("/portal/work-orders")}`
        : `/lift-repair-form?techName=${encodeURIComponent(activeTechnician.name)}&techId=${activeTechnician.id}&customerId=${selectedCustomer.id}&customerName=${encodeURIComponent(selectedCustomer.name)}&returnTo=${encodeURIComponent("/portal/work-orders")}`
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
      {clientLike ? (
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
              : role === "administrator"
                ? "View and filter work orders for your assigned locations."
                : "Start a new repair or view your completed work."}
          </p>
        </div>
      )}

      {(role === "technician" || role === "owner") && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="font-medium text-zinc-900">New repair report</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Select {role === "owner" ? "technician, type, and customer" : "type and customer"} to start a repair form.
          </p>
          <div className="mt-4 space-y-3">
            {role === "owner" && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Label className="w-16 shrink-0">Tech</Label>
                <Combobox
                  items={technicians}
                  value={selectedTechnician}
                  onValueChange={(v) => setSelectedTechnician(v as Technician | null)}
                  itemToStringLabel={(t) => (t as Technician).name}
                  isItemEqualToValue={(a, b) => (a as Technician)?.id === (b as Technician)?.id}
                >
                  <ComboboxInput
                    className="h-11 w-full text-base sm:h-9 sm:w-[260px] sm:text-sm"
                    placeholder={techniciansLoading ? "Loading technicians…" : "Search technician…"}
                    disabled={techniciansLoading}
                    showClear={!!selectedTechnician}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No technician found.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem
                          className="min-h-11 px-3 text-base sm:min-h-8 sm:px-1.5 sm:text-sm"
                          key={(item as Technician).id}
                          value={item as Technician}
                        >
                          {(item as Technician).name}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            )}
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
          clientLike
            ? "rounded-2xl border-zinc-200/80 shadow-md shadow-zinc-200/20 ring-1 ring-zinc-100/80"
            : "rounded-md border-zinc-200"
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between",
            clientLike ? "border-zinc-100 bg-zinc-50/60 sm:px-5" : "border-zinc-200"
          )}
        >
          <div className="min-w-0 shrink-0 sm:max-w-[min(100%,28rem)]">
            <h2
              className={
                clientLike
                  ? "text-base font-semibold tracking-tight text-zinc-900 sm:text-lg"
                  : "font-medium text-zinc-900"
              }
            >
              {role === "owner" ? "All work orders" : "Your work orders"}
            </h2>
            {canAttachFilesOnList && (
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Drag a PDF or image onto a row to attach it without opening the work order.
              </p>
            )}
          </div>
          {role !== "technician" && (
            <div className="grid w-full grid-cols-1 items-stretch gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {showOwnerStyleFilters && (
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
                  Attached file
                </Label>
                <Select value={filterFiles} onValueChange={(v) => setFilterFiles(v as FileFilterValue)}>
                  <SelectTrigger
                    size="sm"
                    className="h-7 min-h-7 w-full rounded-md border-zinc-200 text-xs"
                  >
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="has">Has file</SelectItem>
                    <SelectItem value="none">No file</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              {showOwnerStyleFilters && (
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
                    setFilterFiles("all");
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
            </div>
          )}
        </div>
        {loading ? (
          <div
            className={cn(
              "p-8 text-center text-zinc-500",
              clientLike && "py-12 text-sm"
            )}
          >
            Loading…
          </div>
        ) : filteredOrders.length === 0 ? (
          clientLike ? (
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
                clientLike
                  ? "space-y-2 p-3 sm:space-y-2.5 sm:p-4"
                  : "divide-y divide-zinc-200"
              )}
            >
              {visibleOrders.map((o) => (
                <WorkOrderListRowWithOptionalFileDrop
                  key={o.id}
                  order={o}
                  clientLike={clientLike}
                  showOwnerStyleFilters={showOwnerStyleFilters}
                  fileDropEnabled={canAttachFilesOnList}
                  onFilesUploaded={() => markWorkOrderHasFiles(o.id)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="border-t border-zinc-200 px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full text-xs"
                  onClick={() => {
                    if (clientLike) {
                      setClientListLimit((n) =>
                        Math.min(n + CLIENT_WORK_ORDERS_PAGE_SIZE, filteredOrders.length)
                      );
                      return;
                    }
                    setOwnerListLimit((n) =>
                      Math.min(n + OWNER_WORK_ORDERS_PAGE_SIZE, filteredOrders.length)
                    );
                  }}
                >
                  Show more (
                  {clientLike
                    ? filteredOrders.length - clientListLimit
                    : filteredOrders.length - ownerListLimit}{" "}
                  remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {(role === "owner" || clientLike) && (
        <div
          className={cn(
            "border border-zinc-200 bg-white shadow-sm",
            clientLike
              ? "rounded-2xl border-zinc-200/80 shadow-md shadow-zinc-200/20 ring-1 ring-zinc-100/80"
              : "rounded-md"
          )}
        >
          <div
            className={cn(
              "border-b px-4 py-3",
              clientLike ? "border-zinc-100 bg-zinc-50/60 sm:px-5" : "border-zinc-200"
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-medium text-zinc-900">Print preview ({reportRows.length})</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Choose Table or List, then print. Table includes description and parts; list shows full detail.
                  Uses current filters.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 self-stretch sm:flex-row sm:items-center sm:gap-3">
                <ReportFormatToggle
                  value={reportPrintFormat}
                  onChange={setReportPrintFormat}
                  className="self-start sm:self-center"
                />
                {!disablePrintOnMobilePwa && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 w-full text-xs sm:w-auto",
                      clientLike &&
                        "border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700 hover:text-white"
                    )}
                    onClick={() => {
                      setDialogPrintFormat(reportPrintFormat);
                      setPrintDialogOpen(true);
                    }}
                  >
                    <Printer className="mr-1.5 size-3.5" />
                    Print report
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div>
            <style>{`
              .report-print-sheet-inline { display: none; }
              @media print {
                body * { visibility: hidden !important; }
                .report-print-sheet-inline,
                .report-print-sheet-inline * { visibility: visible !important; }
                .report-print-sheet-inline {
                  display: block !important;
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  background: #fff !important;
                  z-index: 9999 !important;
                }
                .report-screen { display: none !important; }
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
                  font-size: 11px !important;
                  line-height: 1.4 !important;
                }
                .report-print-sheet-inline .report-list-card {
                  padding: 10px 12px !important;
                  margin-bottom: 12px !important;
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                }
                .report-print-sheet-inline .report-list-card-title {
                  border-bottom: 2px solid #000 !important;
                  padding-bottom: 6px !important;
                  margin: 0 0 8px 0 !important;
                  font-size: 12px !important;
                  font-weight: 800 !important;
                }
                .report-print-sheet-inline .report-list-card-body,
                .report-print-sheet-inline .report-list-card-extra {
                  font-size: 11px !important;
                  line-height: 1.45 !important;
                }
                .report-print-sheet-inline .report-data-table th,
                .report-print-sheet-inline .report-data-table td {
                  border: 1px solid #000 !important;
                  padding: 4px 5px !important;
                  vertical-align: top !important;
                  word-wrap: break-word !important;
                  break-inside: avoid-page !important;
                  page-break-inside: avoid !important;
                }
                .report-print-sheet-inline .report-data-table tr {
                  break-inside: avoid-page !important;
                  page-break-inside: avoid !important;
                  page-break-after: auto !important;
                }
                .report-print-sheet-inline .report-data-table .report-row-group {
                  break-inside: avoid-page !important;
                  page-break-inside: avoid !important;
                }
                .report-print-sheet-inline .report-data-table thead {
                  display: table-header-group !important;
                }
                .report-print-sheet-inline .report-data-table tbody {
                  display: table-row-group !important;
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
                .report-print-sheet-inline .report-grid-table {
                  width: 100% !important;
                  font-size: 11px !important;
                  line-height: 1.4 !important;
                }
                .report-print-sheet-inline .report-grid-head,
                .report-print-sheet-inline .report-grid-row {
                  display: grid !important;
                  grid-template-columns: 12% 16% 12% 26% 34% !important;
                  width: 100% !important;
                }
                .report-print-sheet-inline .report-grid-head > div {
                  border: 1px solid #000 !important;
                  background: #18181b !important;
                  color: #fff !important;
                  font-weight: 700 !important;
                  text-transform: uppercase !important;
                  padding: 4px 5px !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .report-print-sheet-inline .report-grid-row {
                  break-inside: avoid-page !important;
                  page-break-inside: avoid !important;
                }
                .report-print-sheet-inline .report-grid-row.report-row-alt > div {
                  background: #f4f4f5 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .report-print-sheet-inline .report-grid-cell {
                  border: 1px solid #000 !important;
                  padding: 4px 5px !important;
                  vertical-align: top !important;
                  word-wrap: break-word !important;
                  overflow-wrap: anywhere !important;
                }
              }
            `}</style>

            <div className="report-screen">
              <div className="hidden p-4 md:block">
                <div className="rounded-lg border border-zinc-200 bg-white">
                  {reportPrintFormat === "table" ? (
                    <div className="overflow-x-auto">
                      <ReportDataTable rows={reportRows} density="screen" />
                    </div>
                  ) : (
                    <div className="p-2 sm:p-3">
                      <ReportPrintList rows={reportRows} density="screen" />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 md:hidden">
                {reportRows.length === 0 ? (
                  <div className="rounded-xl border border-zinc-200 p-6 text-center text-base text-zinc-500">
                    No rows match current filters.
                  </div>
                ) : reportPrintFormat === "table" ? (
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <div className="min-w-[640px]">
                      <ReportDataTable rows={reportRows} density="screen" />
                    </div>
                  </div>
                ) : (
                  <ReportPrintList rows={reportRows} density="screen" />
                )}
              </div>
            </div>

            <div className="report-print-sheet-inline bg-white p-6 text-black">
              <ReportPrintHeader recordCount={reportRows.length} />
              <div className="mt-1">
                {reportPrintFormat === "table" ? (
                  <ReportDataTable rows={reportRows} />
                ) : (
                  <ReportPrintList rows={reportRows} density="print" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {(role === "owner" || clientLike) && (
        <div className="hidden">
          <div ref={reportPrintRef} data-work-order-print>
            <div className="report-print-sheet bg-white p-6 text-black">
              <style>{`
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
                font-size: 11px !important;
                line-height: 1.4 !important;
              }
              .report-data-table th,
              .report-data-table td {
                border: 1px solid #000 !important;
                padding: 5px 6px !important;
                vertical-align: top !important;
                word-wrap: break-word !important;
                break-inside: avoid-page !important;
                page-break-inside: avoid !important;
              }
              .report-data-table tr {
                break-inside: avoid-page !important;
                page-break-inside: avoid !important;
                page-break-after: auto !important;
              }
              .report-data-table .report-row-group {
                break-inside: avoid-page !important;
                page-break-inside: avoid !important;
              }
              .report-data-table thead {
                display: table-header-group !important;
              }
              .report-data-table tbody {
                display: table-row-group !important;
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
              .report-grid-table {
                width: 100% !important;
                font-size: 11px !important;
                line-height: 1.4 !important;
              }
              .report-grid-head,
              .report-grid-row {
                display: grid !important;
                grid-template-columns: 12% 16% 12% 26% 34% !important;
                width: 100% !important;
              }
              .report-grid-head > div {
                border: 1px solid #000 !important;
                background: #18181b !important;
                color: #fff !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
                padding: 5px 6px !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .report-grid-row {
                break-inside: avoid-page !important;
                page-break-inside: avoid !important;
              }
              .report-grid-row.report-row-alt > div {
                background: #f4f4f5 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .report-grid-cell {
                border: 1px solid #000 !important;
                padding: 5px 6px !important;
                vertical-align: top !important;
                word-wrap: break-word !important;
                overflow-wrap: anywhere !important;
              }
              .report-list-card {
                padding: 10px 12px !important;
                margin-bottom: 12px !important;
                break-inside: avoid-page !important;
                page-break-inside: avoid !important;
              }
              .report-list-card-title {
                border-bottom: 2px solid #000 !important;
                padding-bottom: 6px !important;
                margin: 0 0 8px 0 !important;
                font-size: 12px !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.06em !important;
              }
              .report-list-card-body,
              .report-list-card-extra {
                font-size: 11px !important;
                line-height: 1.45 !important;
              }
            `}</style>
              <ReportPrintHeader recordCount={reportRows.length} />
              <div className="mt-1">
                {reportPrintFormat === "table" ? (
                  <ReportDataTable rows={reportRows} />
                ) : (
                  <ReportPrintList rows={reportRows} density="print" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {(role === "owner" || clientLike) && (
        <Dialog
          open={printDialogOpen}
          onOpenChange={(open) => {
            setPrintDialogOpen(open);
            if (open) setDialogPrintFormat(reportPrintFormat);
          }}
        >
          <DialogContent
            className="gap-0 overflow-hidden border-zinc-200/90 bg-linear-to-b from-white to-zinc-50/95 p-0 shadow-2xl sm:max-w-2xl"
            showCloseButton
            closeButtonClassName="top-3.5 right-3.5 text-zinc-500 hover:text-zinc-900"
          >
            <div className="border-b border-zinc-200/80 bg-white px-5 pb-4 pt-5">
              <DialogHeader className="gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900">
                    Print work order report
                  </DialogTitle>
                  <ReportFormatToggle value={dialogPrintFormat} onChange={setDialogPrintFormat} />
                </div>
                <DialogDescription className="text-sm text-zinc-600">
                  Preview matches what will print. {reportRows.length} record
                  {reportRows.length === 1 ? "" : "s"} with current filters.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="max-h-[min(56vh,480px)] overflow-auto px-5 py-4">
              <div className="rounded-lg border border-zinc-200 bg-white">
                {dialogPrintFormat === "table" ? (
                  <div className="overflow-x-auto">
                    <ReportDataTable rows={reportRows} density="screen" />
                  </div>
                ) : (
                  <div className="p-2 sm:p-3">
                    <ReportPrintList rows={reportRows} density="screen" />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t border-zinc-200/80 bg-white px-6 pb-6 pt-4 sm:justify-end sm:gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setPrintDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className={
                  clientLike
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

      {clientLike && (
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
