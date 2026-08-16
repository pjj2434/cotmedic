"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, FileText, Trash2 } from "lucide-react";
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
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import type { Role } from "@/lib/with-auth";
import { isLocationPortalRole } from "@/lib/portal-roles";

/** Checklist is COTMEDIC-only for now; lift will be added later. */
const CHECKLIST_TYPE = "cot" as const;
const CHECKLIST_TYPE_LABEL = "COTMEDIC";

type Technician = { id: string; name: string };
type Customer = { id: string; name: string; customerType?: string };

type ChecklistListItem = {
  id: string;
  type: string;
  technicianName: string;
  customerName: string;
  submittedByName?: string | null;
  workDateLabel?: string;
  serialNumber?: string;
  createdAt: string;
};

export function ChecklistClient({
  role,
  userId,
  technicianName,
}: {
  role: Role;
  userId: string;
  technicianName: string;
}) {
  const isOwner = role === "owner";
  const canCreate = role === "owner" || role === "technician";
  const clientLike = isLocationPortalRole(role);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [techniciansLoading, setTechniciansLoading] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(
    role === "technician" ? { id: userId, name: technicianName } : null
  );
  const [submitted, setSubmitted] = useState<ChecklistListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchChecklists = useCallback(async () => {
    try {
      const res = await fetch("/api/checklists");
      if (!res.ok) throw new Error("Failed to fetch checklists");
      const data = (await res.json()) as { checklists?: ChecklistListItem[] };
      setSubmitted(Array.isArray(data.checklists) ? data.checklists : []);
    } catch {
      setSubmitted([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const fetchTechnicians = useCallback(async () => {
    if (!isOwner) return;
    setTechniciansLoading(true);
    try {
      const res = await fetch("/api/technicians");
      if (!res.ok) throw new Error("Failed to fetch technicians");
      const data = (await res.json()) as { technicians?: { id: string; name: string }[] };
      setTechnicians(
        (data.technicians ?? [])
          .map((u) => ({ id: u.id, name: String(u.name ?? "").trim() || "Unnamed technician" }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch {
      setTechnicians([]);
    } finally {
      setTechniciansLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  useEffect(() => {
    if (!canCreate) return;
    let cancelled = false;
    setCustomersLoading(true);
    fetch(`/api/customers?type=${encodeURIComponent(CHECKLIST_TYPE)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch customers");
        const data = (await res.json()) as { customers?: Customer[] };
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
  }, [canCreate]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/checklists?id=${encodeURIComponent(deleteId)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      toast.success("Checklist deleted");
      setSubmitted((prev) => prev.filter((c) => c.id !== deleteId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  const activeTechnician = isOwner
    ? selectedTechnician
    : role === "technician"
      ? { id: userId, name: technicianName }
      : null;
  const formUrl =
    canCreate && selectedCustomer && activeTechnician
      ? `/checklist-form?type=${encodeURIComponent(CHECKLIST_TYPE)}&techName=${encodeURIComponent(activeTechnician.name)}&techId=${encodeURIComponent(activeTechnician.id)}&customerId=${encodeURIComponent(selectedCustomer.id)}&customerName=${encodeURIComponent(selectedCustomer.name)}&returnTo=${encodeURIComponent("/portal/checklist")}`
      : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      {canCreate && (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="font-medium text-zinc-900">New checklist</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Select {isOwner ? "technician and customer" : "customer"} to open a {CHECKLIST_TYPE_LABEL}{" "}
          checklist.
        </p>
        <div className="mt-4 space-y-3">
          {isOwner && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Label className="w-20 shrink-0">Tech</Label>
              <Combobox
                items={technicians}
                value={selectedTechnician}
                onValueChange={(v) => setSelectedTechnician(v as Technician | null)}
                itemToStringLabel={(t) => (t as Technician).name}
                isItemEqualToValue={(a, b) => (a as Technician)?.id === (b as Technician)?.id}
              >
                <ComboboxInput
                  className="h-11 w-full text-base sm:h-9 sm:w-[260px] sm:text-sm"
                  placeholder={
                    techniciansLoading ? "Loading technicians…" : "Search technician…"
                  }
                  disabled={techniciansLoading}
                  showClear={!!selectedTechnician}
                />
                <ComboboxContent>
                  <ComboboxEmpty>No technician found.</ComboboxEmpty>
                  <ComboboxList>
                    {(item) => (
                      <ComboboxItem
                        className="min-h-11 px-3 text-base sm:min-h-8 sm:px-1.5 sm:text-sm"
                        key={(item as Technician).id}
                        value={item as Technician}
                      >
                        {(item as Technician).name}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Label className="w-20 shrink-0">Customer</Label>
            <Combobox
              items={customers}
              value={selectedCustomer}
              onValueChange={(v) => setSelectedCustomer(v as Customer | null)}
              itemToStringLabel={(c) => (c as Customer).name}
              isItemEqualToValue={(a, b) => (a as Customer)?.id === (b as Customer)?.id}
            >
              <ComboboxInput
                className="h-11 w-full text-base sm:h-9 sm:w-[260px] sm:text-sm"
                placeholder={customersLoading ? "Loading…" : "Search customer…"}
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
          {formUrl && (
            <Button asChild className="w-full bg-red-600 hover:bg-red-700 sm:w-auto">
              <Link href={formUrl}>
                <FileText className="mr-2 size-4" />
                Open checklist
              </Link>
            </Button>
          )}
        </div>
      </div>
      )}

      <div className="rounded-md border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-4">
          <h2 className="font-medium text-zinc-900">
            {isOwner ? "All checklists" : clientLike ? "Your checklists" : "Checklist history"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {clientLike
              ? "PM checklists for your location appear here."
              : "Submitted checklists appear here, same as work orders."}
          </p>
        </div>
        {listLoading ? (
          <p className="p-6 text-sm text-zinc-500">Loading…</p>
        ) : submitted.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">No checklists submitted yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {submitted.map((item) => (
              <li key={item.id} className="flex items-stretch">
                <Link
                  href={`/portal/checklist/${item.id}`}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 sm:text-base">
                      {item.customerName} · {CHECKLIST_TYPE_LABEL}
                    </p>
                    <p className="text-xs text-zinc-500 sm:text-sm">
                      {item.technicianName}
                      {item.workDateLabel ? ` · ${item.workDateLabel}` : ""}
                    </p>
                    {isOwner && (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Submitted by: {item.submittedByName ?? "—"}
                      </p>
                    )}
                    {item.serialNumber ? (
                      <div className="mt-1">
                        <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 ring-1 ring-zinc-200 sm:text-xs">
                          Serial: {item.serialNumber}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-zinc-400" />
                </Link>
                {isOwner && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="my-auto mr-2 size-8 shrink-0 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete checklist"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected checklist.
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
