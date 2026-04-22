"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Image, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/lib/uploadthing";
import { toast } from "sonner";

type ClientFile = {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

export function CustomerFilesClient({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/client-files?clientId=${encodeURIComponent(clientId)}`);
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/client-files?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setFiles((prev) => prev.filter((f) => f.id !== id));
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

  const isImage = (mime: string) => mime.startsWith("image/");
  const isPdf = (mime: string) => mime === "application/pdf";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/portal/customers">
            <ArrowLeft className="mr-2 size-4" />
            Back to Customers
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Files for {clientName}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload PDFs and images. Files are visible to this client in their Files page.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-zinc-900">Upload files</h2>
        <UploadDropzone
          endpoint="clientFileUploader"
          input={{ clientId }}
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

      <div className="rounded-xl border border-zinc-200 bg-white">
        <h2 className="border-b border-zinc-200 px-4 py-3 font-medium text-zinc-900">
          Uploaded files ({files.length})
        </h2>
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading…</div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No files yet.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleDelete(f.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
