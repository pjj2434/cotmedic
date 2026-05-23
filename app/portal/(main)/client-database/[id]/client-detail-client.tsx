"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { ArrowLeft, FileText, Image, Pencil, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  formatBalanceCents,
  formatClientBillingAddress,
  formatContactAddressInline,
} from "@/lib/client-database";
import {
  clientTagClass,
  clientTagLabel,
  type ClientDisplayTag,
} from "@/lib/client-tags";
import { UploadDropzone } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

type ClientRecord = {
  id: string;
  name: string;
  balanceCents: number;
  paymentStatus: string;
  isActive: boolean;
  displayTags: ClientDisplayTag[];
  notes: string | null;
  lastQuickbooksSyncAt: string | null;
  quickbooksCustomerId: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  billStreet?: string | null;
  billCity?: string | null;
  billState?: string | null;
  billZip?: string | null;
  billCountry?: string | null;
};

type ServiceAgreementFile = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

function isPdfMime(mime: string) {
  return mime === "application/pdf" || mime.endsWith("/pdf");
}

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  notes: string | null;
  quickbooksCustomerId: string | null;
};

const emptyContactForm = () => ({
  name: "",
  email: "",
  phone: "",
  location: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "USA",
  notes: "",
});

function billingFormFromClient(client: ClientRecord) {
  return {
    companyName: client.companyName ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    billStreet: client.billStreet ?? "",
    billCity: client.billCity ?? "",
    billState: client.billState ?? "",
    billZip: client.billZip ?? "",
    billCountry: client.billCountry ?? "USA",
  };
}

export function ClientDetailClient({ id }: { id: string }) {
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [qbRefreshing, setQbRefreshing] = useState(false);
  const [billingForm, setBillingForm] = useState({
    companyName: "",
    email: "",
    phone: "",
    billStreet: "",
    billCity: "",
    billState: "",
    billZip: "",
    billCountry: "USA",
  });
  const [billingEditing, setBillingEditing] = useState(false);
  const [billingDirty, setBillingDirty] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [serviceAgreements, setServiceAgreements] = useState<ServiceAgreementFile[]>([]);
  const [agreementsLoading, setAgreementsLoading] = useState(true);

  function cancelBillingEdit() {
    if (client) setBillingForm(billingFormFromClient(client));
    setBillingDirty(false);
    setBillingEditing(false);
  }

  const fetchServiceAgreements = useCallback(async () => {
    setAgreementsLoading(true);
    try {
      const res = await fetch(
        `/api/client-database/${encodeURIComponent(id)}/service-agreements`
      );
      const data = (await res.json().catch(() => ({}))) as {
        files?: ServiceAgreementFile[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load service agreements");
      setServiceAgreements(data.files ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load service agreements");
      setServiceAgreements([]);
    } finally {
      setAgreementsLoading(false);
    }
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/client-database/${encodeURIComponent(id)}`);
      const data = (await res.json().catch(() => ({}))) as {
        client?: ClientRecord;
        contacts?: Contact[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load client");
      const loaded = data.client ?? null;
      setClient(loaded);
      setContacts(data.contacts ?? []);
      setNotes(loaded?.notes ?? "");
      setNotesDirty(false);
      if (loaded) {
        setBillingForm(billingFormFromClient(loaded));
        setBillingDirty(false);
      }
      void fetchServiceAgreements();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load client");
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [id, fetchServiceAgreements]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshFromQuickBooks() {
    if (!client?.quickbooksCustomerId) {
      toast.error("This client is not linked to QuickBooks");
      return;
    }
    setQbRefreshing(true);
    try {
      const res = await fetch(`/api/client-database/${encodeURIComponent(id)}/sync`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        client?: ClientRecord;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      await load();
      toast.success("Updated from QuickBooks");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "QuickBooks refresh failed");
    } finally {
      setQbRefreshing(false);
    }
  }

  async function saveBilling() {
    if (!client) return;
    setBillingSaving(true);
    try {
      const res = await fetch(`/api/client-database/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: billingForm.companyName,
          email: billingForm.email,
          phone: billingForm.phone,
          billStreet: billingForm.billStreet,
          billCity: billingForm.billCity,
          billState: billingForm.billState,
          billZip: billingForm.billZip,
          billCountry: billingForm.billCountry,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        client?: ClientRecord;
        quickbooksUpdated?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to save billing info");
      if (data.client) {
        setClient(data.client);
        setBillingForm(billingFormFromClient(data.client));
      }
      setBillingDirty(false);
      setBillingEditing(false);
      toast.success(
        data.quickbooksUpdated
          ? "Billing info saved and updated in QuickBooks"
          : "Billing info saved"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save billing info");
    } finally {
      setBillingSaving(false);
    }
  }

  async function setClientActive(isActive: boolean) {
    if (!client) return;
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/client-database/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        client?: ClientRecord;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to update status");
      if (data.client) setClient(data.client);
      toast.success(isActive ? "Client marked active" : "Client marked inactive");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  }

  async function openServiceAgreement(fileId: string) {
    try {
      const res = await fetch(
        `/api/client-database/${encodeURIComponent(id)}/service-agreements/${encodeURIComponent(fileId)}/download`
      );
      const data = (await res.json().catch(() => ({}))) as {
        signedUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.signedUrl) {
        throw new Error(data.error ?? "Could not open file");
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open file");
    }
  }

  async function deleteServiceAgreement(fileId: string) {
    try {
      const res = await fetch(
        `/api/client-database/${encodeURIComponent(id)}/service-agreements?fileId=${encodeURIComponent(fileId)}`,
        { method: "DELETE" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to delete file");
      toast.success("Service agreement removed");
      await fetchServiceAgreements();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete file");
    }
  }

  async function saveNotes() {
    if (!client) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/client-database/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        quickbooksUpdated?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to save notes");
      setNotesDirty(false);
      toast.success(
        data.quickbooksUpdated
          ? "Notes saved and updated in QuickBooks"
          : "Notes saved"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  function openAddContact() {
    setEditingContact(null);
    setContactForm(emptyContactForm());
    setContactDialogOpen(true);
  }

  function openEditContact(contact: Contact) {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      location: contact.location ?? "",
      street: contact.street ?? "",
      city: contact.city ?? "",
      state: contact.state ?? "",
      zip: contact.zip ?? "",
      country: contact.country ?? "USA",
      notes: contact.notes ?? "",
    });
    setContactDialogOpen(true);
  }

  async function saveContact() {
    if (!contactForm.name.trim()) {
      toast.error("Contact name is required");
      return;
    }
    setContactSaving(true);
    try {
      const body = {
        name: contactForm.name.trim(),
        email: contactForm.email.trim() || undefined,
        phone: contactForm.phone.trim() || undefined,
        location: contactForm.location.trim() || undefined,
        street: contactForm.street.trim() || undefined,
        city: contactForm.city.trim() || undefined,
        state: contactForm.state.trim() || undefined,
        zip: contactForm.zip.trim() || undefined,
        country: contactForm.country.trim() || undefined,
        notes: contactForm.notes.trim() || undefined,
      };
      const url = editingContact
        ? `/api/client-database/${encodeURIComponent(id)}/contacts/${encodeURIComponent(editingContact.id)}`
        : `/api/client-database/${encodeURIComponent(id)}/contacts`;
      const res = await fetch(url, {
        method: editingContact ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save contact");
      setContactDialogOpen(false);
      toast.success(editingContact ? "Contact updated" : "Contact added");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save contact");
    } finally {
      setContactSaving(false);
    }
  }

  async function confirmDeleteContact() {
    if (!deleteContact) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/client-database/${encodeURIComponent(id)}/contacts/${encodeURIComponent(deleteContact.id)}`,
        { method: "DELETE" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to delete contact");
      setDeleteContact(null);
      toast.success("Contact removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete contact");
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-zinc-500">Loading client…</div>;
  }

  if (!client) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-zinc-600">Client not found.</p>
        <Button asChild variant="outline">
          <Link href="/portal/client-database">
            <ArrowLeft className="mr-2 size-4" />
            Back to client database
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 text-zinc-600">
          <Link href="/portal/client-database">
            <ArrowLeft className="mr-2 size-4" />
            Client database
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{client.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
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
              <span className="text-sm text-zinc-600">
                Balance: {formatBalanceCents(client.balanceCents)}
              </span>
              {client.lastQuickbooksSyncAt && (
                <span className="text-xs text-zinc-400">
                  QB sync {new Date(client.lastQuickbooksSyncAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {client.isActive ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={statusSaving}
                onClick={() => void setClientActive(false)}
              >
                Mark inactive
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="bg-zinc-800 hover:bg-zinc-900"
                disabled={statusSaving}
                onClick={() => void setClientActive(true)}
              >
                Mark active
              </Button>
            )}
            {client.quickbooksCustomerId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={qbRefreshing}
                onClick={() => void refreshFromQuickBooks()}
              >
                <RefreshCw className={cn("mr-2 size-4", qbRefreshing && "animate-spin")} />
                {qbRefreshing ? "Refreshing…" : "Refresh from QuickBooks"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="font-medium text-zinc-900">Billing info</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Synced with QuickBooks. Saving updates the customer in QuickBooks too.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {billingEditing ? (
              <>
                <Button type="button" size="sm" variant="outline" onClick={cancelBillingEdit}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  disabled={billingSaving || !billingDirty}
                  onClick={() => void saveBilling()}
                >
                  {billingSaving ? "Saving…" : "Save"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (client) setBillingForm(billingFormFromClient(client));
                  setBillingDirty(false);
                  setBillingEditing(true);
                }}
              >
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {billingEditing ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="bill-company">Company</Label>
            <Input
              id="bill-company"
              value={billingForm.companyName}
              onChange={(e) => {
                setBillingForm((f) => ({ ...f, companyName: e.target.value }));
                setBillingDirty(true);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bill-email">Email</Label>
            <Input
              id="bill-email"
              type="email"
              value={billingForm.email}
              onChange={(e) => {
                setBillingForm((f) => ({ ...f, email: e.target.value }));
                setBillingDirty(true);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bill-phone">Phone</Label>
            <Input
              id="bill-phone"
              type="tel"
              value={billingForm.phone}
              onChange={(e) => {
                setBillingForm((f) => ({ ...f, phone: e.target.value }));
                setBillingDirty(true);
              }}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="bill-street">Street</Label>
            <Input
              id="bill-street"
              value={billingForm.billStreet}
              onChange={(e) => {
                setBillingForm((f) => ({ ...f, billStreet: e.target.value }));
                setBillingDirty(true);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bill-city">City</Label>
            <Input
              id="bill-city"
              value={billingForm.billCity}
              onChange={(e) => {
                setBillingForm((f) => ({ ...f, billCity: e.target.value }));
                setBillingDirty(true);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bill-state">State</Label>
            <Input
              id="bill-state"
              value={billingForm.billState}
              onChange={(e) => {
                setBillingForm((f) => ({ ...f, billState: e.target.value }));
                setBillingDirty(true);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bill-zip">ZIP</Label>
            <Input
              id="bill-zip"
              value={billingForm.billZip}
              onChange={(e) => {
                setBillingForm((f) => ({ ...f, billZip: e.target.value }));
                setBillingDirty(true);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bill-country">Country</Label>
            <Input
              id="bill-country"
              value={billingForm.billCountry}
              onChange={(e) => {
                setBillingForm((f) => ({ ...f, billCountry: e.target.value }));
                setBillingDirty(true);
              }}
            />
          </div>
        </div>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <dt className="text-zinc-500">Company</dt>
            <dd className="text-zinc-900">{client.companyName?.trim() || "—"}</dd>
            <dt className="text-zinc-500">Email</dt>
            <dd className="text-zinc-900">
              {client.email?.trim() ? (
                <a href={`mailto:${client.email}`} className="text-red-700 hover:underline">
                  {client.email}
                </a>
              ) : (
                "—"
              )}
            </dd>
            <dt className="text-zinc-500">Phone</dt>
            <dd className="text-zinc-900">
              {client.phone?.trim() ? (
                <a href={`tel:${client.phone}`} className="hover:underline">
                  {client.phone}
                </a>
              ) : (
                "—"
              )}
            </dd>
            <dt className="text-zinc-500">Billing address</dt>
            <dd className="whitespace-pre-line text-zinc-900">
              {formatClientBillingAddress(client) ?? "—"}
            </dd>
          </dl>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="font-medium text-zinc-900">Notes</h2>
            {client.quickbooksCustomerId && (
              <p className="mt-1 text-sm text-zinc-500">
                Saves to QuickBooks when this client is linked. Refresh or full sync pulls
                the latest from QuickBooks.
              </p>
            )}
          </div>
          {notesDirty && (
            <Button
              type="button"
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              disabled={savingNotes}
              onClick={() => void saveNotes()}
            >
              {savingNotes ? "Saving…" : "Save notes"}
            </Button>
          )}
        </div>
        <Textarea
          className="min-h-[140px] resize-y"
          placeholder="Internal notes about this client…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(true);
          }}
        />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="font-medium text-zinc-900">Contacts</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Sites and sub-customers from QuickBooks sync on refresh. You can also add contacts
              manually.
            </p>
          </div>
          <Button type="button" size="sm" className="bg-red-600 hover:bg-red-700" onClick={openAddContact}>
            <UserPlus className="mr-2 size-4" />
            Add contact
          </Button>
        </div>

        {contacts.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-500">
            No contacts yet. Add the first contact for this client.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-2.5">Name</th>
                  <th className="px-5 py-2.5">Location</th>
                  <th className="px-5 py-2.5">Address</th>
                  <th className="px-5 py-2.5">Phone</th>
                  <th className="px-5 py-2.5">Notes</th>
                  <th className="w-24 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-medium text-zinc-900">{c.name}</div>
                      {c.quickbooksCustomerId && (
                        <span className="mt-1 inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          QuickBooks
                        </span>
                      )}
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="mt-0.5 block text-xs text-red-700 hover:underline"
                        >
                          {c.email}
                        </a>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{c.location || "—"}</td>
                    <td className="max-w-[200px] px-5 py-3 text-zinc-600">
                      {formatContactAddressInline(c) ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="hover:underline">
                          {c.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-[180px] px-5 py-3 text-zinc-600">
                      <p className="line-clamp-2 whitespace-pre-line">
                        {c.notes?.trim() || "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Edit contact"
                          onClick={() => openEditContact(c)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-red-600 hover:text-red-700"
                          aria-label="Delete contact"
                          onClick={() => setDeleteContact(c)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 className="font-medium text-zinc-900">Service agreements</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Upload PDF or image service agreements. Files are private; downloads use presigned URLs.
          </p>
        </div>
        <div className="border-b border-zinc-200 p-4">
          <UploadDropzone
            endpoint="clientRecordServiceAgreementUploader"
            input={{ clientRecordId: id }}
            config={{ mode: "auto" }}
            onClientUploadComplete={() => {
              void fetchServiceAgreements();
              toast.success("Service agreement uploaded");
            }}
            onUploadError={(err) => {
              toast.error(err.message);
            }}
            className="ut-button:bg-red-600 ut-button:ut-readying:bg-red-500 ut-button:ut-uploading:bg-red-600"
          />
        </div>
        {agreementsLoading ? (
          <div className="p-6 text-center text-sm text-zinc-500">Loading agreements…</div>
        ) : serviceAgreements.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">No service agreements yet.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {serviceAgreements.map((file) => (
              <div key={file.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <button
                  type="button"
                  onClick={() => void openServiceAgreement(file.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left text-zinc-900 hover:text-red-600"
                >
                  {isImageMime(file.mimeType) ? (
                    <Image className="size-8 shrink-0 text-zinc-400" />
                  ) : (
                    <FileText className="size-8 shrink-0 text-zinc-400" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatFileSize(file.size)} ·{" "}
                      {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-red-600 hover:text-red-700"
                  aria-label="Delete service agreement"
                  onClick={() => void deleteServiceAgreement(file.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContact ? "Edit contact" : "Add contact"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={contactForm.name}
                onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Contact name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-location">Location / site</Label>
              <Input
                id="contact-location"
                value={contactForm.location}
                onChange={(e) => setContactForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Branch or sub-customer name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-street">Street</Label>
              <Input
                id="contact-street"
                value={contactForm.street}
                onChange={(e) => setContactForm((f) => ({ ...f, street: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="col-span-2 grid gap-2 sm:col-span-2">
                <Label htmlFor="contact-city">City</Label>
                <Input
                  id="contact-city"
                  value={contactForm.city}
                  onChange={(e) => setContactForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-state">State</Label>
                <Input
                  id="contact-state"
                  value={contactForm.state}
                  onChange={(e) => setContactForm((f) => ({ ...f, state: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-zip">ZIP</Label>
                <Input
                  id="contact-zip"
                  value={contactForm.zip}
                  onChange={(e) => setContactForm((f) => ({ ...f, zip: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={contactForm.phone}
                onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(555) 555-5555"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
                className="min-h-[80px] resize-y"
                value={contactForm.notes}
                onChange={(e) => setContactForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Site notes or QuickBooks customer notes"
              />
            </div>
            {editingContact?.quickbooksCustomerId && (
              <p className="text-xs text-zinc-500">
                This contact is linked to QuickBooks. Address and notes may be overwritten on refresh.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setContactDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={contactSaving}
              onClick={() => void saveContact()}
            >
              {contactSaving ? "Saving…" : editingContact ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteContact} onOpenChange={(open) => !open && setDeleteContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deleteContact?.name} from {client.name}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteLoading}
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteContact();
              }}
            >
              {deleteLoading ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
