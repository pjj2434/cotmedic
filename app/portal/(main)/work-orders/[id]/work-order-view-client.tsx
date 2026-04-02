"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, FileText, Image, Trash2 } from "lucide-react";
import Link from "next/link";
import { WorkOrderFormView } from "@/components/work-order-form-view";
import { printWorkOrderContent } from "@/lib/print-work-order";
import { UploadDropzone } from "@/lib/uploadthing";
import { toast } from "sonner";

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

export function WorkOrderViewClient({ id, role }: { id: string; role: string }) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [files, setFiles] = useState<WorkOrderFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/work-orders?id=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Not found" : "Failed to load");
        return res.json();
      })
      .then((data) => setWorkOrder(data))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [id]);

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
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/portal/work-orders">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
        <Button size="sm" className="hidden sm:inline-flex" onClick={handlePrint}>
          <Printer className="mr-2 size-4" />
          Print
        </Button>
      </div>
      <div ref={printContentRef} className="p-4 sm:p-5">
        <WorkOrderFormView type={workOrder.type} formData={workOrder.formData} />
      </div>
      <div className="mx-4 mb-6 rounded-md border border-zinc-200 bg-white shadow-sm sm:mx-5">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Work order files ({files.length})</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Attachments specific to this work order.
          </p>
        </div>
        {canUpload && (
          <div className="border-b border-zinc-200 p-4">
            <UploadDropzone
              endpoint="workOrderFileUploader"
              input={{ workOrderId: id }}
              config={{ mode: "auto" }}
              onClientUploadComplete={() => {
                fetchFiles();
                toast.success("Files uploaded");
              }}
              onUploadError={(err) => toast.error(err.message)}
              className="ut-button:bg-red-600 ut-button:ut-readying:bg-red-500 ut-button:ut-uploading:bg-red-600"
            />
          </div>
        )}
        {files.length === 0 ? (
          <div className="p-6 text-center text-zinc-500">No files yet.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
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
    </div>
  );
}
