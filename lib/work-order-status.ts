export type WorkOrderStatus = "pass" | "fail";

/** postMessage type when checklist form runs inside the work-order dialog iframe. */
export const CHECKLIST_EMBEDDED_DONE_MESSAGE = "checklist-embedded-done";

export function parseWorkOrderStatus(value: unknown): WorkOrderStatus | null {
  if (value === "pass" || value === "fail") return value;
  return null;
}

export function cycleWorkOrderStatus(
  current: WorkOrderStatus | null
): WorkOrderStatus | null {
  if (current === null) return "pass";
  if (current === "pass") return "fail";
  return null;
}

export function workOrderStatusLabel(status: WorkOrderStatus | null | undefined): string {
  if (status === "pass") return "Pass";
  if (status === "fail") return "Fail";
  return "";
}
