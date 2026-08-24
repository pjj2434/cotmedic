"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/lib/with-auth";
import { isLocationPortalRole } from "@/lib/portal-roles";

type WorkType = "cot" | "lift";
type EquipmentType = "stretcher" | "lift";

type Technician = { id: string; name: string };
type Customer = { id: string; name: string; customerType?: string };

type ChecklistListItem = {
  id: string;
  type: string;
  customerId: string;
  technicianName: string;
  customerName: string;
  submittedByName?: string | null;
  workDateLabel?: string;
  serialNumber?: string;
  equipmentType?: string;
  createdAt: string;
};

function equipmentLabel(value?: string) {
  if (value === "lift") return "Lift";
  if (value === "stretcher") return "Stretcher";
  return null;
}

function brandLabel(type?: string) {
  return type === "lift" ? "Lift Medik" : "Cot Medik";
}

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
  const searchParams = useSearchParams();
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

  const [filterCustomerId, setFilterCustomerId] = useState<string>("__all__");
  const [filterQuery, setFilterQuery] = useState(() => searchParams.get("q")?.trim() ?? "");
  const [filterEquipment, setFilterEquipment] = useState<string>("__all__");
  const [filterBrand, setFilterBrand] = useState<string>("__all__");
  const [workType, setWorkType] = useState<WorkType | "">("");

  useEffect(() => {
    const q = searchParams.get("q")?.trim() ?? "";
    if (q) setFilterQuery(q);
  }, [searchParams]);
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
    if (!workType) {
      setCustomers([]);
      setSelectedCustomer(null);
      return;
    }
    let cancelled = false;
    setCustomersLoading(true);
    setSelectedCustomer(null);
    fetch(`/api/customers?type=${encodeURIComponent(workType)}`)
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
  }, [canCreate, workType]);

  const filterCustomers = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of submitted) {
      if (item.customerId) map.set(item.customerId, item.customerName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [submitted]);

  const filtered = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return submitted.filter((item) => {
      if (isOwner && filterCustomerId !== "__all__" && item.customerId !== filterCustomerId) {
        return false;
      }
      if (filterBrand !== "__all__" && item.type !== filterBrand) {
        return false;
      }
      if (
        filterEquipment !== "__all__" &&
        item.equipmentType !== (filterEquipment as EquipmentType)
      ) {
        return false;
      }
      if (q) {
        const eq = equipmentLabel(item.equipmentType)?.toLowerCase() ?? "";
        const hay = [
          item.serialNumber ?? "",
          item.customerName,
          item.technicianName,
          item.equipmentType ?? "",
          eq,
          brandLabel(item.type),
          item.workDateLabel ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [submitted, isOwner, filterCustomerId, filterQuery, filterEquipment, filterBrand]);

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
    canCreate && workType && selectedCustomer && activeTechnician
      ? `/checklist-form?type=${encodeURIComponent(workType)}&techName=${encodeURIComponent(activeTechnician.name)}&techId=${encodeURIComponent(activeTechnician.id)}&customerId=${encodeURIComponent(selectedCustomer.id)}&customerName=${encodeURIComponent(selectedCustomer.name)}&returnTo=${encodeURIComponent("/portal/checklist")}`
      : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-3">
      {canCreate && (
        <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1 basis-full sm:basis-auto">
              <h2 className="text-sm font-medium text-zinc-900">New checklist</h2>
              <p className="text-xs text-zinc-500">
                {isOwner ? "Tech, type, customer" : "Type and customer"}
              </p>
            </div>
            {isOwner && (
              <div className="min-w-[10rem] flex-1 sm:max-w-[14rem]">
                <Label className="mb-1 text-xs text-zinc-500">Tech</Label>
                <Combobox
                  items={technicians}
                  value={selectedTechnician}
                  onValueChange={(v) => setSelectedTechnician(v as Technician | null)}
                  itemToStringLabel={(t) => (t as Technician).name}
                  isItemEqualToValue={(a, b) => (a as Technician)?.id === (b as Technician)?.id}
                >
                  <ComboboxInput
                    className="h-9 w-full text-sm"
                    placeholder={techniciansLoading ? "Loading…" : "Technician…"}
                    disabled={techniciansLoading}
                    showClear={!!selectedTechnician}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No technician found.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem
                          className="min-h-8 px-1.5 text-sm"
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

            <div className="w-full sm:w-[9.5rem]">
              <Label className="mb-1 text-xs text-zinc-500">Type</Label>
              <Select
                value={workType || "__none__"}
                onValueChange={(v) => setWorkType(v === "__none__" ? "" : (v as WorkType))}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cot">Cot Medik</SelectItem>
                  <SelectItem value="lift">Lift Medik</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[10rem] flex-1 sm:max-w-[16rem]">
              <Label className="mb-1 text-xs text-zinc-500">Customer</Label>
              <Combobox
                items={customers}
                value={selectedCustomer}
                onValueChange={(v) => setSelectedCustomer(v as Customer | null)}
                itemToStringLabel={(c) => (c as Customer).name}
                isItemEqualToValue={(a, b) => (a as Customer)?.id === (b as Customer)?.id}
              >
                <ComboboxInput
                  className="h-9 w-full text-sm"
                  placeholder={
                    !workType
                      ? "Select type first…"
                      : customersLoading
                        ? "Loading…"
                        : "Customer…"
                  }
                  disabled={!workType || customersLoading}
                  showClear={!!selectedCustomer}
                />
                <ComboboxContent>
                  <ComboboxEmpty>No customer found.</ComboboxEmpty>
                  <ComboboxList>
                    {(item) => (
                      <ComboboxItem
                        className="min-h-8 px-1.5 text-sm"
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
              <Button asChild size="sm" className="h-9 bg-red-600 hover:bg-red-700">
                <Link href={formUrl}>
                  <FileText className="mr-1.5 size-4" />
                  Open {workType === "cot" ? "Cot" : "Lift"}
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-md border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-900">
              {isOwner ? "All checklists" : clientLike ? "Your checklists" : "Checklist history"}
            </h2>
          </div>

          {(isOwner || clientLike || role === "technician") && (
            <div
              className={
                isOwner
                  ? "mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                  : "mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
              }
            >
              {isOwner && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-500">Customer</Label>
                  <Select value={filterCustomerId} onValueChange={setFilterCustomerId}>
                    <SelectTrigger className="h-8 w-full text-sm">
                      <SelectValue placeholder="All customers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All customers</SelectItem>
                      {filterCustomers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Search</Label>
                <Input
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Serial, customer, tech…"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Brand</Label>
                <Select value={filterBrand} onValueChange={setFilterBrand}>
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue placeholder="All brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All brands</SelectItem>
                    <SelectItem value="cot">Cot Medik</SelectItem>
                    <SelectItem value="lift">Lift Medik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Equipment</Label>
                <Select value={filterEquipment} onValueChange={setFilterEquipment}>
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue placeholder="All equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All equipment</SelectItem>
                    <SelectItem value="stretcher">Stretcher</SelectItem>
                    <SelectItem value="lift">Lift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        {listLoading ? (
          <p className="p-4 text-sm text-zinc-500">Loading…</p>
        ) : submitted.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No checklists submitted yet.</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No checklists match these filters.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {filtered.map((item) => {
              const eqLabel = equipmentLabel(item.equipmentType);
              return (
                <li key={item.id} className="flex items-stretch">
                  <Link
                    href={`/portal/checklist/${item.id}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-zinc-50 sm:px-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {item.customerName} · {brandLabel(item.type)}
                        {eqLabel ? ` · ${eqLabel}` : ""}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {item.technicianName}
                        {item.workDateLabel ? ` · ${item.workDateLabel}` : ""}
                        {item.serialNumber ? ` · ${item.serialNumber}` : ""}
                        {isOwner && item.submittedByName
                          ? ` · by ${item.submittedByName}`
                          : ""}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-zinc-400" />
                  </Link>
                  {isOwner && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="my-auto mr-1.5 size-7 shrink-0 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete checklist"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </li>
              );
            })}
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
