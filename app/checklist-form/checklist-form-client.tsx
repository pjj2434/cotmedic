"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INITIAL_CHECKLIST, type ChecklistItem, type ChecklistResult } from "@/lib/checklist-items";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/with-auth";

function PassFailToggle({
  value,
  onChange,
}: {
  value: ChecklistResult;
  onChange: (next: ChecklistResult) => void;
}) {
  const passed = value === "Passed";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={passed}
      aria-label={passed ? "Passed — click to mark Failed" : "Failed — click to mark Passed"}
      onClick={() => onChange(passed ? "Failed" : "Passed")}
      className={cn(
        "relative inline-flex h-8 w-[4.75rem] shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:h-[2.125rem] sm:w-[5.25rem]",
        passed
          ? "bg-emerald-500 focus-visible:ring-emerald-500"
          : "bg-red-500 focus-visible:ring-red-500"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 flex items-center text-[0.65rem] font-bold uppercase tracking-wide text-white sm:text-xs",
          passed ? "left-2" : "right-2"
        )}
      >
        {passed ? "Pass" : "Fail"}
      </span>
      <span
        className={cn(
          "inline-block size-6 rounded-full bg-white shadow transition-transform sm:size-[1.625rem]",
          passed ? "translate-x-[2.85rem] sm:translate-x-[3.05rem]" : "translate-x-1"
        )}
      />
    </button>
  );
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

  // Checklist is COTMEDIC-only for now; lift type will be added later.
  const type = searchParams.get("type") === "cot" ? "cot" : "";
  const customerId = searchParams.get("customerId")?.trim() ?? "";
  const customerName = searchParams.get("customerName")?.trim() ?? "";
  const techIdParam = searchParams.get("techId")?.trim() ?? "";
  const techNameParam = searchParams.get("techName")?.trim() ?? "";
  const returnTo = searchParams.get("returnTo")?.trim() || "/portal/checklist";

  const technicianId = role === "owner" ? techIdParam : userId;
  const technicianName = role === "owner" ? techNameParam || userName : userName;

  const paramsValid = !!type && !!customerId && !!technicianId;

  const [repairNecessary, setRepairNecessary] = useState(false);
  const [dateOfService, setDateOfService] = useState("");
  const [workOrderType, setWorkOrderType] = useState("Preventative Maintenance");
  const [problemDescription, setProblemDescription] = useState("");
  const [repairNotes, setRepairNotes] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [productName, setProductName] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() =>
    INITIAL_CHECKLIST.map((item) => ({ ...item }))
  );
  const [submitting, setSubmitting] = useState(false);

  const customerLabel = useMemo(() => customerName || "Customer", [customerName]);

  function updateItem(index: number, patch: Partial<ChecklistItem>) {
    setChecklist((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
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

    setSubmitting(true);
    try {
      const res = await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          customerId,
          technicianId,
          formData: {
            repairNecessary,
            technicianName,
            dateOfService,
            workOrderType,
            problemDescription,
            repairNotes,
            serialNumber,
            productName,
            modelNumber,
            checklist,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to submit checklist");
      toast.success("Checklist submitted");
      router.push(data.id ? `/portal/checklist/${data.id}` : returnTo);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit checklist");
    } finally {
      setSubmitting(false);
    }
  }

  if (!paramsValid) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white px-4 text-center">
        <p className="text-zinc-600">Select technician and customer first.</p>
        <Button asChild variant="outline">
          <Link href="/portal/checklist">
            <ArrowLeft className="mr-2 size-4" />
            Back to Checklists
          </Link>
        </Button>
      </div>
    );
  }

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
          {customerLabel} · COTMEDIC · {technicianName}
        </p>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-red-600 hover:bg-red-700"
        >
          {submitting ? "Submitting…" : "Submit"}
        </Button>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-3 sm:px-5 lg:max-w-4xl lg:px-6">
        <div className="mb-4 flex justify-center py-2 sm:mb-5 sm:py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/new-logo.png"
            alt="COTMEDIC"
            className="h-20 w-auto max-w-[min(100%,20rem)] object-contain sm:h-24"
          />
        </div>

        <section className="mb-6 sm:mb-7">
          <h2 className="text-lg font-bold sm:text-xl">Work Order Information</h2>
          <div className="mb-3 mt-1 border-b-2 border-red-600" />
          <div className="grid grid-cols-1 gap-y-4 text-sm sm:grid-cols-2 sm:gap-x-8 sm:text-[0.9375rem] lg:gap-x-12">
            <Field label="Repair Necessary?">
              <label className="inline-flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={repairNecessary}
                  onChange={(e) => setRepairNecessary(e.target.checked)}
                  className="size-4 rounded border-neutral-400 text-red-600 focus:ring-red-500 sm:size-[1.125rem]"
                />
                <span className="text-neutral-700">{repairNecessary ? "Yes" : "No"}</span>
              </label>
            </Field>
            <Field label="Technician">
              <div className="border-b border-neutral-300 py-1 text-neutral-700">
                {technicianName}
              </div>
            </Field>
            <Field label="Date of Service">
              <input
                type="date"
                value={dateOfService}
                onChange={(e) => setDateOfService(e.target.value)}
                className="w-auto max-w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-1 text-neutral-700 outline-none focus:border-red-600"
              />
            </Field>
            <Field label="Work Order Type">
              <input
                type="text"
                value={workOrderType}
                onChange={(e) => setWorkOrderType(e.target.value)}
                className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-1 text-neutral-700 outline-none focus:border-red-600"
              />
            </Field>
            <Field label="Problem Description">
              <input
                type="text"
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-1 text-neutral-700 outline-none focus:border-red-600"
              />
            </Field>
            <Field label="Repair/Service Notes" full>
              <textarea
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                rows={2}
                className="w-full resize-y border-0 border-b border-neutral-300 bg-transparent px-0 py-1 text-neutral-700 outline-none focus:border-red-600"
              />
            </Field>
          </div>
        </section>

        <section className="mb-6 sm:mb-7">
          <h2 className="text-lg font-bold sm:text-xl">Asset Information</h2>
          <div className="mb-3 mt-1 border-b-2 border-red-600" />
          <div className="grid grid-cols-1 gap-y-4 text-sm sm:grid-cols-3 sm:gap-x-8 sm:text-center sm:text-[0.9375rem] lg:gap-x-12">
            <Field label="Serial Number" center>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-1 text-neutral-700 outline-none focus:border-red-600 sm:text-center"
              />
            </Field>
            <Field label="Product Name" center>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-1 text-neutral-700 outline-none focus:border-red-600 sm:text-center"
              />
            </Field>
            <Field label="Model Number" center>
              <input
                type="text"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-1 text-neutral-700 outline-none focus:border-red-600 sm:text-center"
              />
            </Field>
          </div>
        </section>

        <section>
          <div className="bg-neutral-300/70">
            <h2 className="px-3 py-2 text-lg font-bold sm:px-4 sm:py-2.5 sm:text-xl">Checklist</h2>
          </div>
          <table className="w-full border-collapse text-sm sm:text-[0.9375rem]">
            <thead>
              <tr className="border-b border-neutral-300">
                <th className="px-3 py-2 text-left font-bold sm:px-4 sm:py-2.5">Description</th>
                <th className="w-28 px-3 py-2 text-right font-bold sm:w-36 sm:px-4 sm:py-2.5">
                  Reading
                </th>
                <th className="w-28 px-3 py-2 text-right font-bold sm:w-40 sm:px-4 sm:py-2.5">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {checklist.map((item, i) => (
                <tr
                  key={item.desc}
                  className={cn("border-b border-neutral-200", i % 2 === 1 && "bg-neutral-100")}
                >
                  <td className="px-3 py-2.5 align-middle text-blue-800 sm:px-4 sm:py-3">
                    {item.desc}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-right sm:px-4 sm:py-3">
                    <input
                      type="text"
                      value={item.reading}
                      onChange={(e) => updateItem(i, { reading: e.target.value })}
                      className="min-h-9 w-full border-0 bg-transparent py-1.5 text-right text-neutral-700 outline-none focus:border-b focus:border-red-600"
                      aria-label={`Reading for ${item.desc}`}
                    />
                  </td>
                  <td className="px-3 py-2.5 align-middle sm:px-4 sm:py-3">
                    <div className="flex justify-end">
                      <PassFailToggle
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

        <div className="mt-8 flex justify-end border-t border-zinc-200 pt-6">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-red-600 hover:bg-red-700 sm:w-auto sm:min-w-40"
          >
            {submitting ? "Submitting…" : "Submit checklist"}
          </Button>
        </div>
      </div>
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
