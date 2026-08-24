"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INITIAL_CHECKLIST, type ChecklistItem, type ChecklistResult } from "@/lib/checklist-items";
import {
  LIFT_PM_CHECKLIST,
  LIFT_PM_DISPOSITION,
  type LiftChecklistStatus,
} from "@/lib/lift-checklist-items";
import { LiftPassFailToggle, LiftStatusToggle } from "@/components/lift-pm-toggles";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/with-auth";

function CotPassFailToggle({
  value,
  onChange,
}: {
  value: ChecklistResult;
  onChange: (next: ChecklistResult) => void;
}) {
  function nextResult(current: ChecklistResult): ChecklistResult {
    if (current === "Passed") return "Failed";
    if (current === "Failed") return "N/A";
    return "Passed";
  }

  const label =
    value === "Passed" ? "Pass" : value === "Failed" ? "Fail" : "N/A";
  const ariaNext =
    value === "Passed"
      ? "Passed — click to mark Failed"
      : value === "Failed"
        ? "Failed — click to mark N/A"
        : "N/A — click to mark Passed";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value === "Passed"}
      aria-label={ariaNext}
      onClick={() => onChange(nextResult(value))}
      className={cn(
        "relative inline-flex h-7 w-[4.75rem] shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:h-8 sm:w-[5.25rem]",
        value === "Passed" && "bg-emerald-500 focus-visible:ring-emerald-500",
        value === "Failed" && "bg-red-500 focus-visible:ring-red-500",
        value === "N/A" && "bg-neutral-500 focus-visible:ring-neutral-500"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 flex items-center text-[0.6rem] font-bold uppercase tracking-wide text-white sm:text-[0.65rem]",
          value === "Passed" && "left-1.5",
          value === "Failed" && "right-1.5",
          value === "N/A" && "left-1/2 -translate-x-1/2"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow transition-transform sm:size-6",
          value === "Passed" && "translate-x-[2.85rem] sm:translate-x-[3.15rem]",
          value === "Failed" && "translate-x-0.5",
          value === "N/A" && "translate-x-[1.55rem] sm:translate-x-[1.7rem]"
        )}
      />
    </button>
  );
}

function normalizeChecklistItems(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return INITIAL_CHECKLIST.map((item) => ({ ...item }));
  }
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    const result =
      row.result === "Failed" ? "Failed" : row.result === "N/A" ? "N/A" : "Passed";
    return {
      desc: typeof row.desc === "string" ? row.desc : "",
      reading: typeof row.reading === "string" ? row.reading : "",
      result,
    };
  });
}

function normalizeLiftStatuses(raw: unknown): Record<string, LiftChecklistStatus | null> {
  const out: Record<string, LiftChecklistStatus | null> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === "P" || value === "F" || value === "NA") out[key] = value;
    else out[key] = null;
  }
  return out;
}

export function ChecklistFormClient({
  role,
  userId,
  userName,
}: {
  role: Role;
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const checklistId = searchParams.get("checklistId")?.trim() ?? "";
  const isEditMode = Boolean(checklistId);

  const typeParam =
    searchParams.get("type") === "lift"
      ? "lift"
      : searchParams.get("type") === "cot"
        ? "cot"
        : "";
  const customerIdParam = searchParams.get("customerId")?.trim() ?? "";
  const customerNameParam = searchParams.get("customerName")?.trim() ?? "";
  const techIdParam = searchParams.get("techId")?.trim() ?? "";
  const techNameParam = searchParams.get("techName")?.trim() ?? "";
  const returnTo =
    searchParams.get("returnTo")?.trim() ||
    (checklistId ? `/portal/checklist/${checklistId}` : "/portal/checklist");

  const [type, setType] = useState<"cot" | "lift" | "">(typeParam);
  const [customerId, setCustomerId] = useState(customerIdParam);
  const [customerName, setCustomerName] = useState(customerNameParam);
  const [technicianId, setTechnicianId] = useState(
    role === "owner" ? techIdParam : userId
  );
  const [technicianName, setTechnicianName] = useState(
    role === "owner" ? techNameParam || userName : userName
  );

  // Cot fields
  const [repairNecessary, setRepairNecessary] = useState(false);
  const [workOrderType, setWorkOrderType] = useState("Preventative Maintenance");
  const [problemDescription, setProblemDescription] = useState("");
  const [repairNotes, setRepairNotes] = useState("");
  const [equipmentType, setEquipmentType] = useState<"stretcher" | "lift" | "">("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() =>
    INITIAL_CHECKLIST.map((item) => ({ ...item }))
  );

  // Shared / lift fields
  const [dateOfService, setDateOfService] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [productName, setProductName] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [liftStatuses, setLiftStatuses] = useState<Record<string, LiftChecklistStatus | null>>(
    {}
  );

  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  const paramsValid = !!type && !!customerId && !!technicianId;
  const customerLabel = useMemo(() => customerName || "Customer", [customerName]);
  const brandLabel = type === "lift" ? "Lift Medik" : "Cot Medik";

  const liftTotal = LIFT_PM_CHECKLIST.length + LIFT_PM_DISPOSITION.length;
  const liftCompleted = Object.values(liftStatuses).filter(Boolean).length;

  useEffect(() => {
    if (!checklistId) return;
    if (role !== "owner") {
      setLoadError("Only owners can edit checklists");
      setLoadingExisting(false);
      return;
    }
    let cancelled = false;
    setLoadingExisting(true);
    fetch(`/api/checklists?id=${encodeURIComponent(checklistId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Not found" : "Failed to load");
        return res.json() as Promise<{
          type: string;
          customerId: string;
          customerName: string;
          technicianId: string;
          technicianName: string;
          formData: string;
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(data.formData) as Record<string, unknown>;
        } catch {
          parsed = {};
        }
        const loadedType =
          data.type === "lift" || data.type === "cot"
            ? data.type
            : typeParam || "cot";
        setType(loadedType);
        setCustomerId(data.customerId || customerIdParam);
        setCustomerName(data.customerName || customerNameParam);
        setTechnicianId(data.technicianId || techIdParam || (role === "owner" ? "" : userId));
        setTechnicianName(
          data.technicianName || techNameParam || (role === "owner" ? "" : userName)
        );
        setDateOfService(
          typeof parsed.dateOfService === "string" ? parsed.dateOfService : ""
        );
        setSerialNumber(typeof parsed.serialNumber === "string" ? parsed.serialNumber : "");
        setProductName(typeof parsed.productName === "string" ? parsed.productName : "");
        setModelNumber(typeof parsed.modelNumber === "string" ? parsed.modelNumber : "");

        if (loadedType === "lift" || parsed.variant === "lift-pm") {
          setLiftStatuses(normalizeLiftStatuses(parsed.statuses));
        } else {
          setRepairNecessary(Boolean(parsed.repairNecessary));
          setWorkOrderType(
            typeof parsed.workOrderType === "string"
              ? parsed.workOrderType
              : "Preventative Maintenance"
          );
          setProblemDescription(
            typeof parsed.problemDescription === "string" ? parsed.problemDescription : ""
          );
          setRepairNotes(typeof parsed.repairNotes === "string" ? parsed.repairNotes : "");
          setEquipmentType(
            parsed.equipmentType === "lift" || parsed.equipmentType === "stretcher"
              ? parsed.equipmentType
              : ""
          );
          setChecklist(normalizeChecklistItems(parsed.checklist));
        }
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [checklistId, role, typeParam, customerIdParam, customerNameParam, techIdParam, techNameParam, userId, userName]);

  function updateItem(index: number, patch: Partial<ChecklistItem>) {
    setChecklist((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function setLiftStatus(id: string, val: LiftChecklistStatus | null) {
    setLiftStatuses((prev) => ({ ...prev, [id]: val }));
  }

  async function handleSubmit() {
    if (!paramsValid) {
      toast.error("Missing customer or technician. Go back and select them first.");
      return;
    }
    if (!dateOfService) {
      toast.error("Date of service is required");
      return;
    }

    let formData: Record<string, unknown>;
    if (type === "lift") {
      formData = {
        variant: "lift-pm",
        technicianName,
        dateOfService,
        productName,
        serialNumber,
        modelNumber,
        statuses: liftStatuses,
      };
    } else {
      if (equipmentType !== "stretcher" && equipmentType !== "lift") {
        toast.error("Select stretcher or lift");
        return;
      }
      formData = {
        repairNecessary,
        technicianName,
        dateOfService,
        workOrderType,
        problemDescription,
        repairNotes,
        serialNumber,
        equipmentType,
        productName,
        modelNumber,
        checklist,
      };
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checklists", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditMode
            ? { id: checklistId, formData }
            : { type, customerId, technicianId, formData }
        ),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? (isEditMode ? "Failed to save" : "Failed to submit"));
      }
      toast.success(isEditMode ? "Checklist updated" : "Checklist submitted");
      router.push(data.id ? `/portal/checklist/${data.id}` : returnTo);
      router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : isEditMode
            ? "Failed to save checklist"
            : "Failed to submit checklist"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingExisting) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-sm text-zinc-500">
        Loading checklist…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white px-4 text-center">
        <p className="text-zinc-600">{loadError}</p>
        <Button asChild variant="outline">
          <Link href="/portal/checklist">
            <ArrowLeft className="mr-2 size-4" />
            Back to Checklists
          </Link>
        </Button>
      </div>
    );
  }

  if (!paramsValid && !isEditMode) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white px-4 text-center">
        <p className="text-zinc-600">Select technician, type, and customer first.</p>
        <Button asChild variant="outline">
          <Link href="/portal/checklist">
            <ArrowLeft className="mr-2 size-4" />
            Back to Checklists
          </Link>
        </Button>
      </div>
    );
  }

  if (!paramsValid && isEditMode) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white px-4 text-center">
        <p className="text-zinc-600">Could not load this checklist for editing.</p>
        <Button asChild variant="outline">
          <Link href={returnTo}>
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
      </div>
    );
  }

  const saveLabel = submitting
    ? isEditMode
      ? "Saving…"
      : "Submitting…"
    : isEditMode
      ? "Save"
      : "Submit";

  return (
    <div className="min-h-dvh bg-white font-sans text-[#111]">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 py-2.5 sm:px-6">
        <Button asChild variant="outline" size="sm">
          <Link href={returnTo}>
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
        <p className="text-sm text-zinc-600 sm:text-base">
          {customerLabel} · {brandLabel} · {technicianName}
          {isEditMode ? " · Editing" : ""}
        </p>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-red-600 hover:bg-red-700"
        >
          {saveLabel}
        </Button>
      </div>

      {type === "lift" ? (
        <div className="min-h-[calc(100dvh-3.25rem)] bg-neutral-100">
          <div className="mx-auto w-full max-w-3xl bg-white sm:my-3 sm:border sm:border-neutral-300 sm:shadow-sm">
            <div className="flex items-center justify-center px-3 pb-2 pt-3 sm:px-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/liftlogo.png"
                alt="Lift Medik"
                className="h-16 w-auto max-w-[min(100%,16rem)] object-contain sm:h-20"
              />
            </div>

            <div className="px-3 pb-1.5 sm:px-6">
              <h1 className="text-lg font-bold leading-tight text-neutral-900 sm:text-xl">
                Pass / Fail Preventive Maintenance Checklist
              </h1>
              <div className="mb-1.5 mt-1.5 border-b-2 border-red-600" />
              <p className="text-[11px] text-neutral-500">
                Tap a status for every line. Tap again to clear.
              </p>
            </div>

            <div className="px-3 py-2.5 sm:px-6">
              <h2 className="mb-2 text-sm font-bold text-neutral-900">Equipment Information</h2>
              <div className="grid grid-cols-1 gap-x-3 gap-y-2 text-sm sm:grid-cols-2">
                <LiftField label="Product Name" full>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-0.5 outline-none focus:border-red-600"
                  />
                </LiftField>
                <LiftField label="Serial Number">
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-0.5 outline-none focus:border-red-600"
                  />
                </LiftField>
                <LiftField label="Model Number">
                  <input
                    type="text"
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value)}
                    className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-0.5 outline-none focus:border-red-600"
                  />
                </LiftField>
                <LiftField label="Technician">
                  <div className="min-h-[1.25rem] border-b border-neutral-300 py-0.5 text-neutral-700">
                    {technicianName}
                  </div>
                </LiftField>
                <LiftField label="Date of Service">
                  <input
                    type="date"
                    value={dateOfService}
                    onChange={(e) => setDateOfService(e.target.value)}
                    className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-0.5 outline-none focus:border-red-600"
                  />
                </LiftField>
              </div>
            </div>

            <div className="px-3 pb-1.5 sm:px-6">
              <div className="mb-0.5 flex items-center justify-between text-[11px] text-neutral-500">
                <span>Progress</span>
                <span>
                  {liftCompleted} / {liftTotal}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full bg-emerald-600 transition-all"
                  style={{ width: `${liftTotal ? (liftCompleted / liftTotal) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="mt-1">
              <div className="bg-neutral-800 px-3 py-1.5 sm:px-6">
                <h2 className="text-xs font-bold tracking-wide text-white sm:text-sm">
                  Inspection Items
                </h2>
              </div>
              <div>
                {LIFT_PM_CHECKLIST.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-neutral-200 px-3 py-2.5 last:border-b-0 sm:px-4 sm:py-3"
                  >
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="shrink-0 text-[10px] font-semibold text-neutral-400">
                        {item.id}
                      </span>
                    </div>
                    <p className="mb-2 text-[13px] leading-snug text-neutral-800 sm:text-sm">
                      {item.desc}
                    </p>
                    <LiftStatusToggle
                      value={liftStatuses[item.id] ?? null}
                      onChange={(val) => setLiftStatus(item.id, val)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-3 py-3 sm:px-6 sm:py-4">
              <h2 className="mb-1 text-sm font-bold text-neutral-900">
                Final Functional Test and Disposition
              </h2>
              <div className="mb-3 border-b-2 border-red-600" />
              <div className="space-y-3">
                {LIFT_PM_DISPOSITION.map((row) => (
                  <div key={row.id}>
                    <p className="mb-1.5 text-[13px] leading-snug text-neutral-800 sm:text-sm">
                      {row.label}
                    </p>
                    <LiftPassFailToggle
                      value={liftStatuses[row.id] ?? null}
                      onChange={(val) => setLiftStatus(row.id, val)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-neutral-200 px-3 py-3 sm:px-6">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {isEditMode ? (submitting ? "Saving…" : "Save checklist") : saveLabel === "Submit" ? "Submit checklist" : saveLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-4xl px-3 pb-8 pt-2 sm:px-5 lg:max-w-5xl lg:px-6">
          <div className="mb-3 flex justify-center py-1.5 sm:mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/new-logo.png"
              alt="Cot Medik"
              className="h-40 w-auto max-w-[min(100%,32rem)] object-contain sm:h-48"
            />
          </div>

          <section className="mb-4 sm:mb-5">
            <h2 className="text-base font-bold sm:text-lg">Work Order Information</h2>
            <div className="mb-2 mt-1 border-b-2 border-red-600" />
            <div className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2 sm:gap-x-6 sm:text-[0.9375rem] lg:gap-x-10">
              <Field label="Repair Necessary?">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={repairNecessary}
                    onChange={(e) => setRepairNecessary(e.target.checked)}
                    className="size-4 rounded border-neutral-400 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-neutral-700">{repairNecessary ? "Yes" : "No"}</span>
                </label>
              </Field>
              <Field label="Technician">
                <div className="border-b border-neutral-300 py-0.5 text-neutral-700">
                  {technicianName}
                </div>
              </Field>
              <Field label="Date of Service">
                <input
                  type="date"
                  value={dateOfService}
                  onChange={(e) => setDateOfService(e.target.value)}
                  className="w-auto max-w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-0.5 text-neutral-700 outline-none focus:border-red-600"
                />
              </Field>
              <Field label="Work Order Type">
                <input
                  type="text"
                  value={workOrderType}
                  onChange={(e) => setWorkOrderType(e.target.value)}
                  className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-0.5 text-neutral-700 outline-none focus:border-red-600"
                />
              </Field>
              <Field label="Problem Description">
                <input
                  type="text"
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-0.5 text-neutral-700 outline-none focus:border-red-600"
                />
              </Field>
              <Field label="Repair/Service Notes" full>
                <textarea
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  rows={2}
                  className="w-full resize-y border-0 border-b border-neutral-300 bg-transparent px-0 py-0.5 text-neutral-700 outline-none focus:border-red-600"
                />
              </Field>
            </div>
          </section>

          <section className="mb-4 sm:mb-5">
            <h2 className="text-base font-bold sm:text-lg">Asset Information</h2>
            <div className="mb-2 mt-1 border-b-2 border-red-600" />
            <div className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2 sm:gap-x-6 sm:text-[0.9375rem] lg:grid-cols-4 lg:gap-x-8">
              <Field label="Serial Number" center>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-0.5 text-neutral-700 outline-none focus:border-red-600 sm:text-center"
                />
              </Field>
              <Field label="Type" center>
                <select
                  value={equipmentType}
                  onChange={(e) =>
                    setEquipmentType(e.target.value as "stretcher" | "lift" | "")
                  }
                  className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-0.5 text-neutral-700 outline-none focus:border-red-600 sm:text-center"
                >
                  <option value="">Select…</option>
                  <option value="stretcher">Stretcher</option>
                  <option value="lift">Lift</option>
                </select>
              </Field>
              <Field label="Product Name" center>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-0.5 text-neutral-700 outline-none focus:border-red-600 sm:text-center"
                />
              </Field>
              <Field label="Model Number" center>
                <input
                  type="text"
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-0.5 text-neutral-700 outline-none focus:border-red-600 sm:text-center"
                />
              </Field>
            </div>
          </section>

          <section>
            <div className="bg-neutral-300/70">
              <h2 className="px-3 py-1.5 text-base font-bold sm:px-4 sm:text-lg">Checklist</h2>
            </div>
            <table className="w-full border-collapse text-[13px] sm:text-sm">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="px-2 py-1.5 text-left font-bold sm:px-3 sm:py-2">Description</th>
                  <th className="w-24 px-2 py-1.5 text-right font-bold sm:w-32 sm:px-3">
                    Reading
                  </th>
                  <th className="w-24 px-2 py-1.5 text-right font-bold sm:w-32 sm:px-3">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {checklist.map((item, i) => (
                  <tr
                    key={`${item.desc}-${i}`}
                    className={cn("border-b border-neutral-200", i % 2 === 1 && "bg-neutral-100")}
                  >
                    <td className="px-2 py-1.5 align-middle text-blue-800 sm:px-3 sm:py-2">
                      {item.desc}
                    </td>
                    <td className="px-2 py-1.5 align-middle text-right sm:px-3 sm:py-2">
                      <input
                        type="text"
                        value={item.reading}
                        onChange={(e) => updateItem(i, { reading: e.target.value })}
                        className="min-h-8 w-full border-0 bg-transparent py-1 text-right text-neutral-700 outline-none focus:border-b focus:border-red-600"
                        aria-label={`Reading for ${item.desc}`}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle sm:px-3 sm:py-2">
                      <div className="flex justify-end">
                        <CotPassFailToggle
                          value={item.result}
                          onChange={(result) => updateItem(i, { result })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="mt-5 flex justify-end border-t border-zinc-200 pt-4">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 sm:w-auto sm:min-w-40"
            >
              {isEditMode
                ? submitting
                  ? "Saving…"
                  : "Save checklist"
                : submitting
                  ? "Submitting…"
                  : "Submit checklist"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  full,
  center,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  center?: boolean;
}) {
  return (
    <div className={cn(full && "sm:col-span-2", center && "sm:text-center")}>
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-800 sm:text-sm">
        {label}
      </div>
      <div className="mt-1 text-neutral-700">{children}</div>
    </div>
  );
}

function LiftField({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-800">{label}</div>
      <div className="mt-0.5 text-neutral-700">{children}</div>
    </div>
  );
}
