"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Printer, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChecklistFormView,
  parseChecklistFormData,
} from "@/components/checklist-form-view";
import { useDisablePrintOnMobilePwa } from "@/hooks/use-mobile-pwa";
import { printWorkOrderContent } from "@/lib/print-work-order";
import { cn } from "@/lib/utils";
import { isLocationPortalRole } from "@/lib/portal-roles";
import type { Role } from "@/lib/with-auth";

type ChecklistRecord = {
  id: string;
  technicianId: string;
  customerId: string;
  type: string;
  formData: string;
  createdAt: string;
  technicianName: string;
  customerName: string;
  submittedByName?: string | null;
  workDateLabel?: string;
  serialNumber?: string;
};

export function ChecklistViewClient({
  id,
  role,
}: {
  id: string;
  role: Role;
  userId: string;
}) {
  const router = useRouter();
  const disablePrintOnMobilePwa = useDisablePrintOnMobilePwa();
  const printContentRef = useRef<HTMLDivElement>(null);
  const [record, setRecord] = useState<ChecklistRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewEnlargedOpen, setPreviewEnlargedOpen] = useState(false);

  const canExpandPreview = role === "owner" || role === "technician" || isLocationPortalRole(role);

  const load = useCallback(async () => {
    const res = await fetch(`/api/checklists?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(res.status === 404 ? "Not found" : "Failed to load");
    return res.json() as Promise<ChecklistRecord>;
  }, [id]);

  useEffect(() => {
    load()
      .then((data) => setRecord(data))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [load]);

  function handlePrint() {
    if (printContentRef.current && record) {
      printWorkOrderContent(printContentRef.current);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/checklists?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      toast.success("Checklist deleted");
      router.push("/portal/checklist");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <p className="text-zinc-600">
          {error === "Not found" ? "Checklist not found" : "Failed to load"}
        </p>
        <Button asChild variant="outline">
          <Link href="/portal/checklist">
            <ArrowLeft className="mr-2 size-4" />
            Back to Checklists
          </Link>
        </Button>
      </div>
    );
  }

  const formData = parseChecklistFormData(record.formData);

  return (
    <div className="min-h-screen bg-zinc-100 -mx-4 -mt-4 w-[calc(100%+2rem)] sm:-mx-5 sm:-mt-5 sm:w-[calc(100%+2.5rem)] md:-mx-6 md:w-[calc(100%+3rem)]">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-2 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href="/portal/checklist">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            size="sm"
            className={cn(disablePrintOnMobilePwa ? "hidden" : "hidden sm:inline-flex")}
            onClick={handlePrint}
          >
            <Printer className="mr-2 size-4" />
            Print
          </Button>
          {role === "owner" && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="px-2 py-2 sm:px-3 sm:py-3">
        {canExpandPreview && (
          <p className="mb-2 text-center text-xs text-zinc-500 print:hidden">
            Tap or click preview to enlarge
          </p>
        )}
        {role === "owner" && (
          <div className="mb-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-sm print:hidden">
            <span className="font-medium text-zinc-900">Submitted by: </span>
            {record.submittedByName ?? "—"}
          </div>
        )}
        <div
          className={cn(
            canExpandPreview &&
              "cursor-zoom-in rounded-md transition-colors hover:bg-zinc-200/40 active:bg-zinc-200/70"
          )}
          role={canExpandPreview ? "button" : undefined}
          tabIndex={canExpandPreview ? 0 : undefined}
          aria-label={canExpandPreview ? "Enlarge checklist preview" : undefined}
          onClick={() => canExpandPreview && setPreviewEnlargedOpen(true)}
          onKeyDown={(e) => {
            if (!canExpandPreview) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setPreviewEnlargedOpen(true);
            }
          }}
        >
          {/* Only the form is printed — chrome stays outside this ref */}
          <div ref={printContentRef}>
            <ChecklistFormView
              formData={formData}
              technicianName={record.technicianName}
              compact
            />
          </div>
        </div>
      </div>

      {canExpandPreview && (
        <Dialog open={previewEnlargedOpen} onOpenChange={setPreviewEnlargedOpen}>
          <DialogContent
            showCloseButton
            className="max-h-[min(92vh,56rem)] w-[calc(100%-1.5rem)] max-w-5xl gap-3 overflow-y-auto p-4 sm:max-w-5xl sm:p-5"
          >
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-base">Checklist</DialogTitle>
            </DialogHeader>
            <div className="min-w-0">
              <ChecklistFormView
                formData={formData}
                technicianName={record.technicianName}
                compact={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the checklist for {record.customerName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
