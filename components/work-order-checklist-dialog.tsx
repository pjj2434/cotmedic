"use client";

import { Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChecklistFormClient } from "@/app/checklist-form/checklist-form-client";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/lib/with-auth";

export type ChecklistPrefill = {
  serialNumber?: string;
  modelNumber?: string;
  productName?: string;
  dateOfService?: string;
};

export function WorkOrderChecklistDialog({
  open,
  onOpenChange,
  type,
  techId,
  techName,
  customerId,
  customerName,
  prefill,
  workOrderId,
  onChecklistSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "cot" | "lift";
  techId: string;
  techName: string;
  customerId: string;
  customerName: string;
  prefill?: ChecklistPrefill;
  workOrderId?: string;
  /** Fired when a checklist is submitted from this dialog (id of the saved checklist). */
  onChecklistSaved?: (checklistId: string) => void;
}) {
  const { data: session } = authClient.useSession();
  const user = session?.user as
    | { id?: string; name?: string; role?: string }
    | undefined;
  const role = (user?.role as Role | undefined) ?? "owner";
  const userId = user?.id ?? techId;
  const userName = user?.name ?? techName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(92vh,56rem)] w-[calc(100%-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <DialogHeader className="shrink-0 border-b border-zinc-200 px-4 py-3 text-left">
          <DialogTitle>
            {type === "lift" ? "Lift" : "Cot"} checklist
            {customerName ? ` · ${customerName}` : ""}
          </DialogTitle>
        </DialogHeader>
        {open && userId ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Suspense
              fallback={
                <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
                  Loading checklist…
                </div>
              }
            >
              <ChecklistFormClient
                role={role}
                userId={userId}
                userName={userName}
                embed={{
                  type,
                  techId,
                  techName,
                  customerId,
                  customerName,
                  workOrderId,
                  serialNumber: prefill?.serialNumber,
                  modelNumber: prefill?.modelNumber,
                  productName: prefill?.productName,
                  dateOfService: prefill?.dateOfService,
                  onDone: (checklistId) => {
                    if (checklistId) onChecklistSaved?.(checklistId);
                    onOpenChange(false);
                  },
                }}
              />
            </Suspense>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
