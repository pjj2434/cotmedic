"use client";

import { useState, useEffect } from "react";
import { FileText, Image } from "lucide-react";

type ClientFile = {
  id: string;
  workOrderId: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

export function FilesClient() {
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/work-order-files")
      .then((res) => (res.ok ? res.json() : { files: [] }))
      .then((data) => setFiles(data.files ?? []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, []);

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const isImage = (mime: string) => mime.startsWith("image/");
  const isPdf = (mime: string) => mime === "application/pdf";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">Files</h1>
        <p className="mt-1 text-sm text-zinc-600">View files attached to your work orders.</p>
      </div>
      <div className="rounded-md border border-zinc-200 bg-white shadow-sm">
        <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold tracking-tight text-zinc-900">
          Work order files ({files.length})
        </h2>
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading…</div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No files yet. Files attached to your work orders will appear here.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {files.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50"
              >
                {isImage(f.mimeType) ? (
                  <Image className="size-8 shrink-0 text-zinc-400" />
                ) : isPdf(f.mimeType) ? (
                  <FileText className="size-8 shrink-0 text-zinc-400" />
                ) : (
                  <FileText className="size-8 shrink-0 text-zinc-400" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{f.name}</p>
                  <p className="text-sm text-zinc-500">
                    WO #{f.workOrderId.slice(0, 8)} · {formatSize(f.size)} · {new Date(f.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
