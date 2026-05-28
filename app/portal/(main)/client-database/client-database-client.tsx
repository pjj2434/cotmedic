"use client";

import { useCallback, useEffect, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link2, RefreshCw, Search, ChevronRight, Unlink, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { formatBalanceCents, formatClientBillingAddressInline } from "@/lib/client-database";
import { clientTagClass, clientTagLabel, type ClientDisplayTag } from "@/lib/client-tags";
import { cn } from "@/lib/utils";
import { uploadFiles } from "@/lib/uploadthing";

type ClientRow = {
  id: string;
  name: string;
  balanceCents: number;
  paymentStatus: string;
  isActive: boolean;
  displayTags: ClientDisplayTag[];
  lastQuickbooksSyncAt: string | null;
  quickbooksCustomerId: string | null;
  billStreet?: string | null;
  billCity?: string | null;
  billState?: string | null;
  billZip?: string | null;
  billCountry?: string | null;
};

function isServiceAgreementFile(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf";
}

function ClientTableRowWithFileDrop({
  client,
  onNavigate,
}: {
  client: ClientRow;
  onNavigate: () => void;
}) {
  const [fileDragOver, setFileDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleDragEnter = useCallback((e: DragEvent<HTMLTableRowElement>) => {
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    setFileDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLTableRowElement>) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setFileDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLTableRowElement>) => {
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLTableRowElement>) => {
      setFileDragOver(false);
      e.preventDefault();
      e.stopPropagation();

      const files = [...e.dataTransfer.files].filter(isServiceAgreementFile);
      if (files.length === 0) {
        toast.error("Drop a PDF or image file");
        return;
      }

      setUploadingFiles(true);
      try {
        await uploadFiles("clientRecordServiceAgreementUploader", {
          files,
          input: { clientRecordId: client.id },
        });
        toast.success(
          files.length === 1
            ? `Service agreement uploaded for ${client.name}`
            : `${files.length} service agreements uploaded for ${client.name}`
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.error(message);
      } finally {
        setUploadingFiles(false);
      }
    },
    [client.id, client.name]
  );

  const handleRowClick = useCallback(() => {
    if (uploadingFiles) return;
    onNavigate();
  }, [onNavigate, uploadingFiles]);

  return (
    <tr
      className={cn(
        "relative cursor-pointer border-b border-zinc-100 transition-colors hover:bg-red-50/40",
        fileDragOver && "bg-red-50 shadow-[inset_0_0_0_2px_rgba(239,68,68,0.65)]",
        uploadingFiles && "bg-red-50/70"
      )}
      onClick={handleRowClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <td
        className={cn(
          "px-4 py-3.5 font-medium",
          client.isActive ? "text-zinc-900" : "text-zinc-400 line-through"
        )}
      >
        {client.name}
      </td>
      <td className="max-w-xs px-4 py-3.5 text-zinc-600">
        {formatClientBillingAddressInline(client) ?? "—"}
      </td>
      <td className="px-4 py-3.5">
        {client.displayTags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {client.displayTags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                  clientTagClass(tag)
                )}
              >
                {clientTagLabel(tag)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-right tabular-nums text-zinc-700">
        {formatBalanceCents(client.balanceCents)}
      </td>
      <td className="px-2 py-3.5 text-zinc-400">
        <ChevronRight className="size-4" />
      </td>
      {(fileDragOver || uploadingFiles) && (
        <td
          colSpan={5}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-0 bg-white/75 p-0 text-sm font-medium text-zinc-800 backdrop-blur-[1px]"
        >
          {uploadingFiles ? "Uploading…" : "Drop service agreement"}
        </td>
      )}
    </tr>
  );
}

export function ClientDatabaseClient() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickbooksConnected, setQuickbooksConnected] = useState(false);
  const [qbAppConfigured, setQbAppConfigured] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    billStreet: "",
    billCity: "",
    billState: "",
    billZip: "",
    billCountry: "USA",
  });

  function resetAddForm() {
    setAddForm({
      name: "",
      companyName: "",
      email: "",
      phone: "",
      billStreet: "",
      billCity: "",
      billState: "",
      billZip: "",
      billCountry: "USA",
    });
  }

  const fetchQbStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/quickbooks/status");
      const data = (await res.json().catch(() => ({}))) as {
        appConfigured?: boolean;
        connected?: boolean;
      };
      if (res.ok) {
        setQbAppConfigured(!!data.appConfigured);
        setQuickbooksConnected(!!data.connected);
      }
    } catch {
      setQbAppConfigured(false);
      setQuickbooksConnected(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/client-database?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        clients?: ClientRow[];
        quickbooksConfigured?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load clients");
      setClients(data.clients ?? []);
      setQuickbooksConnected(!!data.quickbooksConfigured);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load clients");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void fetchQbStatus();
    const params = new URLSearchParams(window.location.search);
    const qb = params.get("qb");
    if (qb === "connected") {
      toast.success("QuickBooks connected successfully");
      window.history.replaceState({}, "", "/portal/client-database");
      void fetchQbStatus();
    } else if (qb === "error") {
      toast.error(decodeURIComponent(params.get("message") ?? "QuickBooks connection failed"));
      window.history.replaceState({}, "", "/portal/client-database");
    }
  }, [fetchQbStatus]);

  useEffect(() => {
    const t = window.setTimeout(() => void fetchClients(), search ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [fetchClients, search]);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/quickbooks/disconnect", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to disconnect");
      toast.success("QuickBooks disconnected");
      setQuickbooksConnected(false);
      await fetchQbStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disconnect QuickBooks");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/client-database/sync", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        synced?: number;
        created?: number;
        updated?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      toast.success(
        `QuickBooks updated — ${data.synced ?? 0} clients (${data.created ?? 0} new, ${data.updated ?? 0} updated).`
      );
      await fetchClients();
      await fetchQbStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "QuickBooks sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddClient() {
    if (!addForm.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    setAddSaving(true);
    try {
      const res = await fetch("/api/client-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          companyName: addForm.companyName.trim() || undefined,
          email: addForm.email.trim() || undefined,
          phone: addForm.phone.trim() || undefined,
          billStreet: addForm.billStreet.trim() || undefined,
          billCity: addForm.billCity.trim() || undefined,
          billState: addForm.billState.trim() || undefined,
          billZip: addForm.billZip.trim() || undefined,
          billCountry: addForm.billCountry.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        client?: { id: string };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to add client");
      toast.success("Client added to QuickBooks and your database");
      setAddOpen(false);
      resetAddForm();
      await fetchClients();
      if (data.client?.id) router.push(`/portal/client-database/${data.client.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add client");
    } finally {
      setAddSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Client database</h1>
          
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!quickbooksConnected ? (
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={!qbAppConfigured}
              onClick={() => {
                window.location.href = "/api/quickbooks/connect";
              }}
            >
              <Link2 className="mr-2 size-4" />
              Connect QuickBooks
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetAddForm();
                  setAddOpen(true);
                }}
              >
                <UserPlus className="mr-2 size-4" />
                Add client
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => void handleSync()}
                disabled={syncing}
                title="Pull the latest customers, balances, and overdue status from QuickBooks"
              >
                <RefreshCw className={cn("mr-2 size-4", syncing && "animate-spin")} />
                {syncing ? "Syncing…" : "Sync QuickBooks now"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disconnecting}
                onClick={() => void handleDisconnect()}
              >
                <Unlink className="mr-2 size-4" />
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="h-10 pl-9"
              placeholder="Search name, email, phone (any format), contacts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full sm:w-[180px]">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-zinc-500">Loading clients…</div>
        ) : clients.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">
            {quickbooksConnected
              ? "No clients yet. Run Sync from QuickBooks to import your customer list."
              : "Connect QuickBooks and sync to populate the client list."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <p className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500">
              Drag a PDF or image onto a client row to upload a service agreement without opening
              the client.
            </p>
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Billing address</th>
                  <th className="px-4 py-3">Tags</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="w-10 px-2 py-3" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <ClientTableRowWithFileDrop
                    key={client.id}
                    client={client}
                    onNavigate={() => router.push(`/portal/client-database/${client.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add client</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-500">
            Creates the customer in QuickBooks and in your client database. Name must be unique in
            QuickBooks.
          </p>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="add-name">Client name *</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="QuickBooks display name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-company">Company name</Label>
              <Input
                id="add-company"
                value={addForm.companyName}
                onChange={(e) => setAddForm((f) => ({ ...f, companyName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-phone">Phone</Label>
                <Input
                  id="add-phone"
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-street">Billing street</Label>
              <Input
                id="add-street"
                value={addForm.billStreet}
                onChange={(e) => setAddForm((f) => ({ ...f, billStreet: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="col-span-2 grid gap-2 sm:col-span-2">
                <Label htmlFor="add-city">City</Label>
                <Input
                  id="add-city"
                  value={addForm.billCity}
                  onChange={(e) => setAddForm((f) => ({ ...f, billCity: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-state">State</Label>
                <Input
                  id="add-state"
                  value={addForm.billState}
                  onChange={(e) => setAddForm((f) => ({ ...f, billState: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-zip">ZIP</Label>
                <Input
                  id="add-zip"
                  value={addForm.billZip}
                  onChange={(e) => setAddForm((f) => ({ ...f, billZip: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={addSaving}
              onClick={() => void handleAddClient()}
            >
              {addSaving ? "Adding…" : "Add to QuickBooks"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-zinc-500">
        Portal logins are managed under{" "}
        <Link href="/portal/customers" className="font-medium text-red-700 hover:underline">
          Locations &amp; logins
        </Link>
        . This database is your QuickBooks-backed CRM with contacts and notes.
      </p>
    </div>
  );
}
