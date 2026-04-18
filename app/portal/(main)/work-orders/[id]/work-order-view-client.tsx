"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Printer, ArrowLeft, FileText, Image, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { WorkOrderFormView } from "@/components/work-order-form-view";
import { printWorkOrderContent } from "@/lib/print-work-order";
import { UploadDropzone } from "@/lib/uploadthing";
import { toast } from "sonner";
import { useDisablePrintOnMobilePwa } from "@/hooks/use-mobile-pwa";
import { cn } from "@/lib/utils";
import { isLocationPortalRole } from "@/lib/portal-roles";

type WorkOrder = {
  id: string;
  technicianId: string;
  customerId: string;
  type: string;
  formData: string;
  createdAt: string;
  technicianName: string;
  customerName: string;
};

type WorkOrderFile = {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

type Customer = { id: string; name: string; customerType?: string };

export function WorkOrderViewClient({ id, role }: { id: string; role: string }) {
  const router = useRouter();
  const disablePrintOnMobilePwa = useDisablePrintOnMobilePwa();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [files, setFiles] = useState<WorkOrderFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewEnlargedOpen, setPreviewEnlargedOpen] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [deleteWorkOrderOpen, setDeleteWorkOrderOpen] = useState(false);
  const [deletingWorkOrder, setDeletingWorkOrder] = useState(false);

  const canExpandPreview = role === "owner" || isLocationPortalRole(role);

  const reloadWorkOrder = useCallback(async () => {
    const res = await fetch(`/api/work-orders?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(res.status === 404 ? "Not found" : "Failed to load");
    return res.json() as Promise<WorkOrder>;
  }, [id]);

  useEffect(() => {
    reloadWorkOrder()
      .then((data) => setWorkOrder(data))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [reloadWorkOrder]);

  useEffect(() => {
    if (!workOrder) return;
    setSelectedCustomer({ id: workOrder.customerId, name: workOrder.customerName });
  }, [workOrder?.id, workOrder?.customerId, workOrder?.customerName]);

  useEffect(() => {
    if (!workOrder || (role !== "owner" && role !== "technician")) return;
    if (workOrder.type !== "cot" && workOrder.type !== "lift") return;
    let cancelled = false;
    setCustomersLoading(true);
    fetch(`/api/customers?type=${encodeURIComponent(workOrder.type)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setCustomers(Array.isArray(data.customers) ? data.customers : []);
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      })
      .finally(() => {
        if (!cancelled) setCustomersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workOrder?.id, workOrder?.type, role]);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/work-order-files?workOrderId=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({ files: [] }));
      if (!res.ok) throw new Error(data.error ?? "Failed to load files");
      setFiles(data.files ?? []);
    } catch {
      setFiles([]);
    }
  }, [id]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handlePrint = () => {
    if (printContentRef.current && workOrder) printWorkOrderContent(printContentRef.current);
  };

  async function handleSaveCustomer() {
    if (!workOrder || !selectedCustomer || !customerDirty) return;
    setSavingCustomer(true);
    try {
      const res = await fetch("/api/work-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workOrder.id, customerId: selectedCustomer.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to update customer");
      const fresh = await reloadWorkOrder();
      setWorkOrder(fresh);
      toast.success("Customer updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update customer");
    } finally {
      setSavingCustomer(false);
    }
  }

  async function handleDeleteWorkOrder() {
    setDeletingWorkOrder(true);
    try {
      const res = await fetch(`/api/work-orders?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      toast.success("Work order deleted");
      router.push("/portal/work-orders");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete work order");
    } finally {
      setDeletingWorkOrder(false);
      setDeleteWorkOrderOpen(false);
    }
  }

  async function handleDeleteFile(fileId: string) {
    try {
      const res = await fetch(`/api/work-order-files?id=${encodeURIComponent(fileId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("File removed");
    } catch {
      toast.error("Failed to remove file");
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const canUpload = role === "owner" || role === "technician";
  const canDelete = role === "owner";
  const canEdit = role === "owner" || role === "technician";
  const canEditCustomer = role === "owner" || role === "technician";
  const canDeleteWorkOrder = role === "owner";
  const customerDirty =
    !!selectedCustomer && !!workOrder && selectedCustomer.id !== workOrder.customerId;
  const isImage = (mime: string) => mime.startsWith("image/");
  const isPdf = (mime: string) => mime === "application/pdf";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }
  if (error || !workOrder) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-100">
        <p className="text-zinc-600">{error === "Not found" ? "Work order not found" : "Failed to load"}</p>
        <Button asChild variant="outline">
          <Link href="/portal/work-orders">
            <ArrowLeft className="mr-2 size-4" />
            Back to Work Orders
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/portal/work-orders">
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
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/${
                  workOrder.type === "lift" ? "lift-repair-form" : "repair-form"
                }?workOrderId=${encodeURIComponent(workOrder.id)}&techName=${encodeURIComponent(workOrder.technicianName)}&techId=${encodeURIComponent(workOrder.technicianId)}&customerId=${encodeURIComponent(workOrder.customerId)}&customerName=${encodeURIComponent(workOrder.customerName)}&returnTo=${encodeURIComponent(`/portal/work-orders/${workOrder.id}`)}`}
              >
                <Pencil className="mr-2 size-4" />
                Edit
              </Link>
            </Button>
          )}
          {canDeleteWorkOrder && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setDeleteWorkOrderOpen(true)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          )}
        </div>
      </div>
      <div
        ref={printContentRef}
        className={cn(
          "px-2 py-2 sm:px-3 sm:py-3",
          canExpandPreview &&
            "cursor-zoom-in rounded-md transition-colors hover:bg-zinc-200/40 active:bg-zinc-200/70"
        )}
        role={canExpandPreview ? "button" : undefined}
        tabIndex={canExpandPreview ? 0 : undefined}
        aria-label={canExpandPreview ? "Enlarge work order preview" : undefined}
        onClick={() => canExpandPreview && setPreviewEnlargedOpen(true)}
        onKeyDown={(e) => {
          if (!canExpandPreview) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setPreviewEnlargedOpen(true);
          }
        }}
      >
        {canExpandPreview && (
          <p className="mb-2 text-center text-xs text-zinc-500">
            Tap or click preview to enlarge
          </p>
        )}
        <WorkOrderFormView type={workOrder.type} formData={workOrder.formData} compact />
      </div>

      {canEditCustomer && (workOrder.type === "cot" || workOrder.type === "lift") && (
        <div className="mx-2 mb-4 rounded-md border border-zinc-200 bg-white p-3 shadow-sm sm:mx-3">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Customer</h2>
          <p className="mt-1 text-xs text-zinc-500">Change the location this work order is tied to.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="work-order-customer" className="text-xs text-zinc-600">
                Location
              </Label>
              <Combobox
                items={customers}
                value={selectedCustomer}
                onValueChange={(v) => setSelectedCustomer(v as Customer | null)}
                itemToStringLabel={(c) => (c as Customer).name}
                isItemEqualToValue={(a, b) => (a as Customer)?.id === (b as Customer)?.id}
              >
                <ComboboxInput
                  id="work-order-customer"
                  className="h-11 w-full text-base sm:h-9 sm:text-sm"
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
            <Button
              type="button"
              className="w-full shrink-0 bg-red-600 hover:bg-red-700 sm:w-auto"
              disabled={!customerDirty || savingCustomer || !selectedCustomer}
              onClick={() => void handleSaveCustomer()}
            >
              {savingCustomer ? "Saving…" : "Save customer"}
            </Button>
          </div>
        </div>
      )}

      {canExpandPreview && (
        <Dialog open={previewEnlargedOpen} onOpenChange={setPreviewEnlargedOpen}>
          <DialogContent
            showCloseButton
            className="max-h-[min(92vh,56rem)] w-[calc(100%-1.5rem)] max-w-5xl gap-3 overflow-y-auto p-4 sm:max-w-5xl sm:p-5"
          >
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-base">Work order</DialogTitle>
            </DialogHeader>
            <div className="min-w-0">
              <WorkOrderFormView
                type={workOrder.type}
                formData={workOrder.formData}
                compact={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      <div className="mx-2 mb-4 rounded-md border border-zinc-200 bg-white shadow-sm sm:mx-3">
        <div className="border-b border-zinc-200 px-3 py-2">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Work order files ({files.length})</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Attachments specific to this work order.
          </p>
        </div>
        {canUpload && (
          <div className="border-b border-zinc-200 p-3">
            <UploadDropzone
              endpoint="workOrderFileUploader"
              input={{ workOrderId: id }}
              config={{ mode: "auto" }}
              onClientUploadComplete={() => {
                fetchFiles();
                toast.success("Files uploaded");
              }}
              onUploadError={(err) => {
                toast.error(err.message);
              }}
              className="ut-button:bg-red-600 ut-button:ut-readying:bg-red-500 ut-button:ut-uploading:bg-red-600"
            />
          </div>
        )}
        {files.length === 0 ? (
          <div className="p-4 text-center text-sm text-zinc-500">No files yet.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-3 text-zinc-900 hover:text-red-600"
                >
                  {isImage(f.mimeType) ? (
                    <Image className="size-8 shrink-0 text-zinc-400" />
                  ) : isPdf(f.mimeType) ? (
                    <FileText className="size-8 shrink-0 text-zinc-400" />
                  ) : (
                    <FileText className="size-8 shrink-0 text-zinc-400" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{f.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatSize(f.size)} · {new Date(f.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </a>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDeleteFile(f.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteWorkOrderOpen} onOpenChange={setDeleteWorkOrderOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this work order?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the work order and its attachments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingWorkOrder}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deletingWorkOrder}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteWorkOrder();
              }}
            >
              {deletingWorkOrder ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
