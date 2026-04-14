"use client";

import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const fieldInputClass =
  "w-full min-w-0 max-w-full rounded-[3px] border border-[#d0d0d0] bg-[#f4f4f4] px-3 py-[9px] text-sm text-[#111] outline-none transition-[border-color,box-shadow] focus:border-[#111] focus:shadow-[0_0_0_2px_rgba(0,0,0,0.08)] placeholder:text-[#777] placeholder:opacity-50";
const pickerInputClass =
  "h-[38px] py-2 pr-2 leading-tight disabled:cursor-not-allowed disabled:opacity-70";

function normalizeDate(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${m}/${d}/${y}`;
  }

  const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!usMatch) return raw;

  const month = Number(usMatch[1]);
  const day = Number(usMatch[2]);
  const year = Number(usMatch[3]);
  const date = new Date(year, month - 1, day);
  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!valid) return raw;
  return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
}

function toDateInputValue(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;
  const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!usMatch) return "";
  const month = Number(usMatch[1]);
  const day = Number(usMatch[2]);
  const year = Number(usMatch[3]);
  const date = new Date(year, month - 1, day);
  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  if (!valid) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeTime(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const mins = Number(twelveHour[2]);
    if (hour >= 1 && hour <= 12 && mins >= 0 && mins <= 59) {
      return `${hour}:${String(mins).padStart(2, "0")} ${twelveHour[3].toUpperCase()}`;
    }
    return raw;
  }

  const twentyFourHour = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!twentyFourHour) return raw;

  const hour24 = Number(twentyFourHour[1]);
  const mins = Number(twentyFourHour[2]);
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, "0")} ${meridiem}`;
}

function getCurrentPickerValues() {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

function PartsColumn({
  title,
  icon,
  items,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  icon: string;
  items: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <div className="border-b border-[#d0d0d0] bg-[#f0f0f0] px-[14px] py-2.5 font-mono text-[11px] tracking-[2px] uppercase">
        <span>{icon}</span> {title}
      </div>
      {items.map((val, i) => (
        <div
          className="flex items-center gap-2 border-b border-[rgba(208,208,208,0.45)] px-2.5 py-1.5 last:border-b-0"
          key={i}
        >
          <span className="min-w-5 font-mono text-[10px] text-[#777]">
            {String(i + 1).padStart(2, "0")}
          </span>
          <input
            type="text"
            placeholder="Part description"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#777] placeholder:opacity-50"
            value={val}
            onChange={(e) => onChange(i, e.target.value)}
          />
          <button
            type="button"
            className="shrink-0 bg-transparent px-1.5 py-0.5 text-sm leading-none text-[#777] hover:text-[#cc0000]"
            onClick={() => onRemove(i)}
            aria-label="Remove row"
          >
            ×
          </button>
        </div>
      ))}
      <div className="p-2">
        <button
          type="button"
          className="rounded-[3px] border border-dashed border-[#d0d0d0] bg-transparent px-3 py-2 text-sm text-[#555]"
          onClick={onAdd}
        >
          + Add row
        </button>
      </div>
    </div>
  );
}

interface FormState {
  date: string;
  time: string;
  techName: string;
  model: string;
  sn: string;
  bus: string;
  description: string;
  partsUsed: string[];
  partsNeeded: string[];
  companyName: string;
  authDate: string;
  authorizedPrint: string;
  authorizedTitle: string;
  authorizedSig: string;
}

const initialFormState: FormState = {
  date: "",
  time: "",
  techName: "",
  model: "",
  sn: "",
  bus: "",
  description: "",
  partsUsed: [""],
  partsNeeded: [""],
  companyName: "",
  authDate: "",
  authorizedPrint: "",
  authorizedTitle: "",
  authorizedSig: "",
};

export default function LiftMedikRepairFormPage() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [useCurrentDateTime, setUseCurrentDateTime] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const techName = searchParams.get("techName");
  const techId = searchParams.get("techId");
  const customerId = searchParams.get("customerId");
  const customerName = searchParams.get("customerName");
  const returnTo = searchParams.get("returnTo");
  const workOrderId = searchParams.get("workOrderId");
  const router = useRouter();
  const lockTechnicianName = Boolean(techId);
  const isEditMode = Boolean(workOrderId);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);

  useEffect(() => {
    if (techName) setForm((f) => ({ ...f, techName }));
    if (customerName) setForm((f) => ({ ...f, companyName: customerName }));
  }, [techName, customerName]);

  useEffect(() => {
    if (!workOrderId) return;
    let cancelled = false;
    setLoadingExisting(true);
    setSubmitError(null);
    fetch(`/api/work-orders?id=${encodeURIComponent(workOrderId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to load work order");
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const parsed =
          typeof data?.formData === "string"
            ? (JSON.parse(data.formData) as Partial<FormState>)
            : (data?.formData as Partial<FormState> | undefined);
        if (!parsed || typeof parsed !== "object") return;
        setForm((prev) => ({
          ...prev,
          ...parsed,
          date: typeof parsed.date === "string" ? toDateInputValue(parsed.date) : prev.date,
          partsUsed:
            Array.isArray(parsed.partsUsed) && parsed.partsUsed.length > 0
              ? parsed.partsUsed
              : prev.partsUsed,
          partsNeeded:
            Array.isArray(parsed.partsNeeded) && parsed.partsNeeded.length > 0
              ? parsed.partsNeeded
              : prev.partsNeeded,
        }));
      })
      .catch((e) => {
        if (!cancelled) setSubmitError(e instanceof Error ? e.message : "Failed to load work order");
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workOrderId]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleToggleCurrentDateTime = (checked: boolean) => {
    setUseCurrentDateTime(checked);
    if (checked) {
      const now = getCurrentPickerValues();
      setForm((f) => ({ ...f, date: now.date, time: now.time }));
    }
  };

  const updateList = (
    key: "partsUsed" | "partsNeeded",
    idx: number,
    val: string
  ) =>
    setForm((f) => {
      const arr = [...f[key]];
      arr[idx] = val;
      return { ...f, [key]: arr };
    });

  const addPart = (key: "partsUsed" | "partsNeeded") =>
    setForm((f) => ({ ...f, [key]: [...f[key], ""] }));

  const removePart = (key: "partsUsed" | "partsNeeded", idx: number) =>
    setForm((f) => {
      const arr = f[key].filter((_, i) => i !== idx);
      return { ...f, [key]: arr.length ? arr : [""] };
    });

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    const normalizedForm: FormState = {
      ...form,
      date: normalizeDate(form.date),
      time: normalizeTime(form.time),
    };
    if (!normalizedForm.techName.trim()) {
      setSubmitError("Technician name is required.");
      setSubmitting(false);
      return;
    }
    if (isEditMode && workOrderId) {
      try {
        const res = await fetch("/api/work-orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: workOrderId,
            formData: normalizedForm,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to save");
        }
        if (returnTo) {
          router.push(returnTo);
          return;
        }
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Failed to save");
        setSubmitting(false);
        return;
      }
    } else if (customerId) {
      try {
        const res = await fetch("/api/work-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "lift",
            customerId,
            technicianId: techId ?? undefined,
            formData: normalizedForm,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to save");
        }
        if (returnTo) {
          router.push(returnTo);
          return;
        }
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Failed to save");
        setSubmitting(false);
        return;
      }
    }
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <>
      <div className="min-h-screen bg-[#e8e8e8] px-5 pb-[60px] pt-8 font-sans text-[#111]">
        <div className="mx-auto max-w-[820px] overflow-hidden rounded border border-[#d0d0d0] bg-white shadow-[0_4px_40px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.04)]">
          <div className="relative flex items-center gap-5 overflow-hidden border-b-2 border-[#ffffff22] bg-linear-to-br from-[#1a1a1a] to-black px-9 pb-6 pt-7 text-white max-md:flex-wrap">
            <div className="flex flex-col items-start gap-2">
              <div className="flex shrink-0 items-center justify-center rounded bg-white px-2.5 py-1.5">
                <Image
                  src="/liftlogo.jpeg"
                  alt="Lift Medik"
                  width={140}
                  height={48}
                  className="h-9 w-auto"
                />
              </div>
              <p className="m-0 font-mono text-[10px] uppercase tracking-[3px] text-[#aaa]">
                Serving the Mobility Assist Community
              </p>
            </div>
            <div className="ml-auto rounded-[3px] border border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.1)] px-[14px] py-1.5 text-[13px] font-semibold uppercase tracking-[1.5px] text-white max-md:hidden">
              PM / Repair Report
            </div>
          </div>

          <div className="px-9 py-7 max-sm:px-[18px] max-sm:py-5">
            <button
              type="button"
              onClick={() => router.push(returnTo || "/portal/work-orders")}
              className="mb-5 rounded-[3px] border border-[#d0d0d0] bg-[#f4f4f4] px-3 py-2 text-xs font-semibold uppercase tracking-[1px] text-[#111] hover:bg-[#eaeaea]"
            >
              Back
            </button>
            <div className="mb-7">
              <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[3px] text-[#111]">
                Identification
              </div>
              <div className="grid grid-cols-4 gap-3 *:min-w-0 max-md:grid-cols-2">
                <div className="flex flex-col gap-[5px]">
                  <label className="font-mono text-[9px] uppercase tracking-[2px] text-[#777]">
                    Date
                  </label>
                  <input
                    className={`${fieldInputClass} ${pickerInputClass} max-w-[170px]`}
                    type="date"
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                    disabled={useCurrentDateTime}
                  />
                </div>
                <div className="flex flex-col gap-[5px]">
                  <label className="font-mono text-[9px] uppercase tracking-[2px] text-[#777]">
                    Time
                  </label>
                  <input
                    className={`${fieldInputClass} ${pickerInputClass} max-w-[150px] w-auto!`}
                    type="time"
                    value={form.time}
                    onChange={(e) => set("time", e.target.value)}
                    disabled={useCurrentDateTime}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-[5px] max-md:col-span-2">
                  <label className="font-mono text-[9px] uppercase tracking-[2px] text-[#777]">
                    Technician Name
                  </label>
                  <input
                    className={fieldInputClass}
                    type="text"
                    placeholder="Full name"
                    value={form.techName}
                    onChange={(e) => set("techName", e.target.value)}
                    readOnly={lockTechnicianName}
                  />
                </div>
              </div>
              <label className="mt-2.5 inline-flex items-center gap-2 text-xs text-[#555]">
                <input
                  type="checkbox"
                  className="size-4 accent-black"
                  checked={useCurrentDateTime}
                  onChange={(e) => handleToggleCurrentDateTime(e.target.checked)}
                />
                Use current date &amp; time
              </label>
            </div>

            <div className="mb-7">
              <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[3px] text-[#111]">
                Equipment
              </div>
              <div className="grid grid-cols-3 gap-3 *:min-w-0 max-md:grid-cols-2">
                {(
                  [
                    ["Model", "model", "Model no."],
                    ["S/N", "sn", "Serial no."],
                    ["Bus", "bus", "Bus ID"],
                  ] as const
                ).map(([l, k, ph]) => (
                  <div className="flex flex-col gap-[5px]" key={k}>
                    <label className="font-mono text-[9px] uppercase tracking-[2px] text-[#777]">
                      {l}
                    </label>
                    <input
                      className={fieldInputClass}
                      type="text"
                      placeholder={ph}
                      value={form[k]}
                      onChange={(e) => set(k, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-7">
              <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[3px] text-[#111]">
                What did you do?
              </div>
              <p className="mb-2.5 mt-[-6px] text-xs leading-relaxed text-[#777]">
                A quick summary helps the next tech and keeps records clear.
              </p>
              <textarea
                className={`${fieldInputClass} min-h-24 resize-y leading-relaxed`}
                rows={4}
                placeholder="What work was done? Any issues you found? The more detail, the better for everyone."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            <div className="mb-7">
              <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[3px] text-[#111]">
                Parts
              </div>
              <p className="mb-2.5 mt-[-6px] text-xs leading-relaxed text-[#777]">
                List what you used and anything we should order for next time.
              </p>
              <div className="grid grid-cols-2 divide-x divide-[#d0d0d0] overflow-hidden rounded-[3px] border border-[#d0d0d0] max-sm:grid-cols-1 max-sm:divide-x-0 max-sm:divide-y">
                <PartsColumn
                  title="Parts you used / replaced"
                  icon="✔"
                  items={form.partsUsed}
                  onChange={(i, v) => updateList("partsUsed", i, v)}
                  onAdd={() => addPart("partsUsed")}
                  onRemove={(i) => removePart("partsUsed", i)}
                />
                <PartsColumn
                  title="Parts to order"
                  icon="⚠"
                  items={form.partsNeeded}
                  onChange={(i, v) => updateList("partsNeeded", i, v)}
                  onAdd={() => addPart("partsNeeded")}
                  onRemove={(i) => removePart("partsNeeded", i)}
                />
              </div>
            </div>

            {submitError && (
              <p className="mb-4 rounded bg-red-50 px-4 py-2 text-sm text-red-700">
                {submitError}
              </p>
            )}
            <button
              type="button"
              className="mt-1 w-full rounded-[3px] border-0 bg-[#111] px-3 py-3.5 text-base uppercase tracking-[2px] text-white disabled:cursor-not-allowed disabled:opacity-70"
              onClick={handleSubmit}
              disabled={submitting || loadingExisting}
            >
              {submitted
                ? isEditMode
                  ? "✔ Report Updated"
                  : "✔ Report Submitted"
                : submitting || loadingExisting
                  ? "Saving…"
                  : isEditMode
                    ? "Update Report"
                    : "Submit Report"}
            </button>
          </div>

          <div className="flex justify-between gap-3 border-t border-[#d0d0d0] bg-[#f0f0f0] px-9 py-3.5 max-sm:flex-col max-sm:items-start">
            <span className="font-mono text-[10px] tracking-[0.5px] text-[#666]">
              Lift Medik INC. · 9189 128th Ave, N., Largo, FL 33773
            </span>
            <span className="font-mono text-[11px] tracking-[1px] text-[#111]">
              P: 855-268-6335
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
