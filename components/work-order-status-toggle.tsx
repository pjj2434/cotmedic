"use client";

import { cn } from "@/lib/utils";
import {
  type WorkOrderStatus,
  workOrderStatusLabel,
} from "@/lib/work-order-status";

export function WorkOrderStatusToggle({
  value,
  onChange,
  className,
}: {
  value: WorkOrderStatus | null;
  onChange: (next: WorkOrderStatus | null) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      <span className="mr-1 font-mono text-[11px] tracking-[1px] text-[#777]">
        Status
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cn(
            "cursor-pointer rounded-[3px] border px-4 py-[5px] text-xs font-semibold tracking-[1px] transition-all",
            value === "pass"
              ? "border-[#1a7a3a] bg-[rgba(26,122,58,0.1)] text-[#1a7a3a]"
              : "border-[#ccc] bg-[#f4f4f4] text-[#777]"
          )}
          onClick={() => onChange(value === "pass" ? null : "pass")}
          aria-pressed={value === "pass"}
        >
          Pass
        </button>
        <button
          type="button"
          className={cn(
            "cursor-pointer rounded-[3px] border px-4 py-[5px] text-xs font-semibold tracking-[1px] transition-all",
            value === "fail"
              ? "border-[#cc0000] bg-[rgba(204,0,0,0.08)] text-[#cc0000]"
              : "border-[#ccc] bg-[#f4f4f4] text-[#777]"
          )}
          onClick={() => onChange(value === "fail" ? null : "fail")}
          aria-pressed={value === "fail"}
        >
          Fail
        </button>
      </div>
    </div>
  );
}

export function WorkOrderStatusBadge({
  status,
  className,
}: {
  status: WorkOrderStatus | null | undefined;
  className?: string;
}) {
  if (status !== "pass" && status !== "fail") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 sm:text-xs",
        status === "pass" && "bg-emerald-50 text-emerald-800 ring-emerald-200",
        status === "fail" && "bg-red-50 text-red-800 ring-red-200",
        className
      )}
    >
      {workOrderStatusLabel(status)}
    </span>
  );
}
