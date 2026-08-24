"use client";

import { LIFT_STATUS_CONFIG, type LiftChecklistStatus } from "@/lib/lift-checklist-items";
import { cn } from "@/lib/utils";

export function LiftStatusToggle({
  value,
  onChange,
}: {
  value: LiftChecklistStatus | null;
  onChange: (next: LiftChecklistStatus | null) => void;
}) {
  return (
    <div className="flex gap-2">
      {(Object.keys(LIFT_STATUS_CONFIG) as LiftChecklistStatus[]).map((key) => {
        const cfg = LIFT_STATUS_CONFIG[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(value === key ? null : key)}
            className={cn(
              "h-9 flex-1 rounded-md border text-xs font-semibold transition-colors active:scale-95 sm:h-10 sm:w-14 sm:flex-none sm:text-sm",
              value === key
                ? cfg.active
                : "border-neutral-300 bg-white text-neutral-500"
            )}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

export function LiftPassFailToggle({
  value,
  onChange,
}: {
  value: LiftChecklistStatus | null;
  onChange: (next: LiftChecklistStatus | null) => void;
}) {
  const options: LiftChecklistStatus[] = ["P", "F"];
  return (
    <div className="flex gap-2">
      {options.map((key) => {
        const cfg = LIFT_STATUS_CONFIG[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(value === key ? null : key)}
            className={cn(
              "h-9 flex-1 rounded-md border text-xs font-semibold transition-colors active:scale-95 sm:h-10 sm:w-20 sm:flex-none sm:text-sm",
              value === key
                ? cfg.active
                : "border-neutral-300 bg-white text-neutral-500"
            )}
          >
            {cfg.full}
          </button>
        );
      })}
    </div>
  );
}

export function liftStatusLabel(status: string | null | undefined): string {
  if (status === "P") return "Pass";
  if (status === "F") return "Fail";
  if (status === "NA") return "N/A";
  return "—";
}
