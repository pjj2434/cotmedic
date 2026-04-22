"use client";

import { useState, useEffect, useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, UserPlus, RotateCcw, X, Lock, Unlock, Trash2, Pencil } from "lucide-react";
import { parseManagedLocationIds } from "@/lib/portal-access";

const INVITE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function randomInvitePassword(): string {
  const a = new Uint8Array(18);
  crypto.getRandomValues(a);
  const s = Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${s}Aa1!`;
}

type User = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role?: string;
  banned?: boolean;
  customerType?: string;
  address?: string | null;
  locationId?: string | null;
  managedLocationIds?: string | null;
};

type AccountKind = "location" | "employee" | "administrator";

function roleToAccountKind(role: string | undefined): AccountKind {
  if (role === "employee") return "employee";
  if (role === "administrator") return "administrator";
  return "location";
}

function accountKindToRole(kind: AccountKind): "client" | "employee" | "administrator" {
  if (kind === "location") return "client";
  if (kind === "employee") return "employee";
  return "administrator";
}

function accountTypeLabel(role: string | undefined): string {
  if (role === "employee") return "Employee";
  if (role === "administrator") return "Administrator";
  return "Location";
}

function emptyCreateForm() {
  return {
    name: "",
    address: "",
    userId: "",
    password: "",
    createLoginNow: false,
    sendMagicLinkInvite: false,
    inviteEmail: "",
    customerType: "cot" as "cot" | "lift" | "both",
    accountKind: "location" as AccountKind,
    employeeLocationId: "",
    adminLocationIds: [] as string[],
  };
}

function slugifyForUserId(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return slug || "location";
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function generateDeferredCredentials(name: string): { userId: string; password: string } {
  const base = slugifyForUserId(name);
  const userId = `pending_${base}_${randomSuffix()}`;
  const password = `${randomSuffix()}${randomSuffix()}A1!`;
  return { userId, password };
}

function isPendingLocationLogin(u: User): boolean {
  const userId = u.username?.trim()
    ? u.username
    : u.email.replace(/@cotmedic\.local$/i, "");
  return roleToAccountKind(u.role) === "location" && userId.startsWith("pending_");
}

export function CustomersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetUserId, setResetUserId] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetSendMagicLink, setResetSendMagicLink] = useState(false);
  const [resetInviteEmail, setResetInviteEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [resetError, setResetError] = useState("");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeUser, setRemoveUser] = useState<User | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editKind, setEditKind] = useState<AccountKind>("location");
  const [editCustomerType, setEditCustomerType] = useState<"cot" | "lift" | "both">("cot");
  const [editAddress, setEditAddress] = useState("");
  const [editEmployeeLocationId, setEditEmployeeLocationId] = useState("");
  const [editAdminLocationIds, setEditAdminLocationIds] = useState<string[]>([]);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSignInEmail, setEditSignInEmail] = useState("");

  function getUserId(u: User) {
    if (u.username?.trim()) return u.username;
    return u.email.replace(/@cotmedic\.local$/i, "");
  }

  const fetchLocations = useCallback(async () => {
    try {
      const { data: res } = await authClient.admin.listUsers({
        query: { filterField: "role", filterValue: "client", filterOperator: "eq", limit: 500 },
      });
      const list = (res as { users?: User[] })?.users ?? [];
      setLocationOptions(list.map((x) => ({ id: x.id, name: x.name })));
    } catch {
      setLocationOptions([]);
    }
  }, []);

  useEffect(() => {
    if (createOpen || editOpen) void fetchLocations();
  }, [createOpen, editOpen, fetchLocations]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const searchOpts = search.trim()
      ? {
          searchValue: search.trim(),
          searchField: "name" as const,
          searchOperator: "contains" as const,
        }
      : {};
    try {
      const roles = ["client", "employee", "administrator"] as const;
      const results = await Promise.all(
        roles.map((filterValue) =>
          authClient.admin.listUsers({
            query: {
              filterField: "role",
              filterValue,
              filterOperator: "eq",
              limit: 500,
              ...searchOpts,
            },
          })
        )
      );
      const byId = new Map<string, User>();
      for (const r of results) {
        for (const u of (r.data as { users?: User[] })?.users ?? []) {
          byId.set(u.id, u as User);
        }
      }
      setUsers(Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (createForm.accountKind === "employee" && !createForm.employeeLocationId) {
      setCreateError("Select a location for this employee.");
      return;
    }
    if (createForm.accountKind === "administrator" && createForm.adminLocationIds.length === 0) {
      setCreateError("Select at least one location for this administrator.");
      return;
    }
    const shouldCreateLoginNow =
      createForm.accountKind !== "location" || createForm.createLoginNow;

    if (shouldCreateLoginNow && createForm.sendMagicLinkInvite) {
      if (!createForm.inviteEmail.trim()) {
        setCreateError("Sign-in email is required when sending a magic link.");
        return;
      }
      const em = createForm.inviteEmail.trim().toLowerCase();
      if (!INVITE_EMAIL_RE.test(em)) {
        setCreateError("Enter a valid sign-in email for the magic link.");
        return;
      }
      if (em.endsWith("@cotmedic.local")) {
        setCreateError("Magic link email must be a real address (not @cotmedic.local).");
        return;
      }
    }

    const sendInvite =
      shouldCreateLoginNow &&
      createForm.sendMagicLinkInvite &&
      createForm.inviteEmail.trim().length > 0;

    if (shouldCreateLoginNow) {
      if (!createForm.userId.trim()) {
        setCreateError("User ID is required.");
        return;
      }
      if (!sendInvite && (!createForm.password || createForm.password.length < 8)) {
        setCreateError("Password must be at least 8 characters.");
        return;
      }
    }

    const inviteEmailNorm = sendInvite ? createForm.inviteEmail.trim().toLowerCase() : null;

    setCreateLoading(true);
    try {
      const generated = !shouldCreateLoginNow
        ? generateDeferredCredentials(createForm.name)
        : null;
      const username = (generated?.userId ?? createForm.userId).trim().toLowerCase();
      const password = sendInvite
        ? randomInvitePassword()
        : (generated?.password ?? createForm.password);
      const role = accountKindToRole(createForm.accountKind);
      const data: Record<string, unknown> = { username };
      if (sendInvite) data.resetPassword = true;
      if (createForm.accountKind === "location") {
        data.customerType = createForm.customerType;
        data.address = createForm.address.trim() || null;
      }
      if (createForm.accountKind === "employee") {
        data.locationId = createForm.employeeLocationId;
      }
      if (createForm.accountKind === "administrator") {
        data.managedLocationIds = JSON.stringify(createForm.adminLocationIds);
      }
      const emailForUser = inviteEmailNorm ?? `${username}@cotmedic.local`;

      const { data: created, error } = await authClient.admin.createUser({
        email: emailForUser,
        password,
        name: createForm.name.trim(),
        // @ts-expect-error custom roles
        role,
        data,
      });
      if (error) {
        setCreateError((error as { message?: string })?.message ?? "Failed to create account");
        return;
      }
      if (created) {
        if (inviteEmailNorm) {
          const inv = await fetch("/api/invite-magic-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email: inviteEmailNorm }),
          });
          if (!inv.ok) {
            const j = (await inv.json().catch(() => ({}))) as { error?: string };
            window.alert(
              `Account was created, but the magic link could not be sent: ${j.error ?? inv.statusText}. The user can still sign in with their password if one was set.`
            );
          }
        }
        setCreateOpen(false);
        setCreateForm(emptyCreateForm());
        fetchUsers();
      }
    } catch {
      setCreateError("Failed to create account");
    } finally {
      setCreateLoading(false);
    }
  }

  function openReset(u: User) {
    setResetUser(u);
    setResetUserId(isPendingLocationLogin(u) ? "" : getUserId(u));
    setResetPassword("");
    setResetSendMagicLink(false);
    setResetInviteEmail("");
    setResetError("");
    setResetOpen(true);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUser) return;
    if (!resetUserId.trim()) {
      setResetError("User ID is required.");
      return;
    }

    const pending = isPendingLocationLogin(resetUser);
    const sendMagic = pending && resetSendMagicLink;

    if (sendMagic) {
      if (!resetInviteEmail.trim()) {
        setResetError("Sign-in email is required when sending a magic link.");
        return;
      }
      const em = resetInviteEmail.trim().toLowerCase();
      if (!INVITE_EMAIL_RE.test(em)) {
        setResetError("Enter a valid sign-in email.");
        return;
      }
      if (em.endsWith("@cotmedic.local")) {
        setResetError("Use a real email address (not @cotmedic.local).");
        return;
      }
    } else if (!resetPassword || resetPassword.length < 8) {
      setResetError("Password must be at least 8 characters");
      return;
    }

    const inviteNorm = sendMagic ? resetInviteEmail.trim().toLowerCase() : null;
    const passwordFinal = sendMagic ? randomInvitePassword() : resetPassword;

    setResetError("");
    setResetLoading(true);
    try {
      const normalizedUserId = resetUserId.trim().toLowerCase();
      const emailForUser = inviteNorm ?? `${normalizedUserId}@cotmedic.local`;

      const { error: updateError } = await authClient.admin.updateUser({
        userId: resetUser.id,
        data: {
          username: normalizedUserId,
          displayUsername: resetUserId.trim(),
          email: emailForUser,
          resetPassword: sendMagic,
        },
      });
      if (updateError) {
        setResetError((updateError as { message?: string })?.message ?? "Failed to set login");
        return;
      }
      const { error } = await authClient.admin.setUserPassword({
        userId: resetUser.id,
        newPassword: passwordFinal,
      });
      if (error) {
        setResetError((error as { message?: string })?.message ?? "Failed to set password");
        return;
      }
      await authClient.admin.revokeUserSessions({ userId: resetUser.id });

      if (inviteNorm) {
        const inv = await fetch("/api/invite-magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: inviteNorm }),
        });
        if (!inv.ok) {
          const j = (await inv.json().catch(() => ({}))) as { error?: string };
          window.alert(
            `Login was saved but the magic link could not be sent: ${j.error ?? inv.statusText}. They can sign in with their password if one was set.`
          );
        }
      }

      setResetOpen(false);
      setResetUser(null);
      setResetUserId("");
      setResetPassword("");
      setResetSendMagicLink(false);
      setResetInviteEmail("");
      fetchUsers();
    } catch {
      setResetError("Failed to save");
    } finally {
      setResetLoading(false);
    }
  }

  function openEdit(u: User) {
    setEditUser(u);
    setEditError("");
    setEditName(u.name?.trim() ?? "");
    const kind = roleToAccountKind(u.role);
    setEditKind(kind);
    const ct = (u.customerType ?? "cot").trim().toLowerCase();
    setEditCustomerType(
      ct === "lift" ? "lift" : ct === "both" ? "both" : "cot"
    );
    setEditAddress(u.address?.trim() || "");
    setEditEmployeeLocationId(u.locationId?.trim() || "");
    setEditAdminLocationIds(parseManagedLocationIds(u.managedLocationIds));
    const em = (u.email ?? "").trim();
    setEditSignInEmail(em.toLowerCase().endsWith("@cotmedic.local") ? "" : em);
    setEditOpen(true);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError("");
    if (editKind === "employee" && !editEmployeeLocationId) {
      setEditError("Select a location.");
      return;
    }
    if (editKind === "administrator" && editAdminLocationIds.length === 0) {
      setEditError("Select at least one location.");
      return;
    }
    if (editKind === "location" && !editName.trim()) {
      setEditError("Customer name is required.");
      return;
    }
    const nextSignInEmail = editSignInEmail.trim().toLowerCase();
    if (nextSignInEmail) {
      if (!INVITE_EMAIL_RE.test(nextSignInEmail)) {
        setEditError("Enter a valid sign-in email.");
        return;
      }
      if (nextSignInEmail.endsWith("@cotmedic.local")) {
        setEditError("Use a real email address (not @cotmedic.local).");
        return;
      }
    }
    setEditLoading(true);
    try {
      const role = accountKindToRole(editKind);
      const data: Record<string, unknown> = { role };
      if (nextSignInEmail) {
        data.email = nextSignInEmail;
      }
      if (editKind === "location") {
        data.name = editName.trim();
        data.customerType = editCustomerType;
        data.address = editAddress.trim() || null;
        data.locationId = null;
        data.managedLocationIds = null;
      } else if (editKind === "employee") {
        data.locationId = editEmployeeLocationId;
        data.managedLocationIds = null;
        data.customerType = null;
        data.address = null;
      } else {
        data.managedLocationIds = JSON.stringify(editAdminLocationIds);
        data.locationId = null;
        data.customerType = null;
        data.address = null;
      }
      const { error } = await authClient.admin.updateUser({
        userId: editUser.id,
        data,
      });
      if (error) {
        setEditError((error as { message?: string })?.message ?? "Failed to update");
        return;
      }
      setEditOpen(false);
      setEditUser(null);
      fetchUsers();
    } catch {
      setEditError("Failed to update");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleBan(user: User) {
    try {
      const { error } = await authClient.admin.banUser({ userId: user.id });
      if (error) throw error;
      fetchUsers();
    } catch {
      // Ignore
    }
  }

  async function handleUnban(user: User) {
    try {
      const { error } = await authClient.admin.unbanUser({ userId: user.id });
      if (error) throw error;
      fetchUsers();
    } catch {
      // Ignore
    }
  }

  function openRemove(u: User) {
    setRemoveUser(u);
    setRemoveOpen(true);
  }

  async function handleRemove() {
    if (!removeUser) return;
    setRemoveLoading(true);
    try {
      const { error } = await authClient.admin.removeUser({ userId: removeUser.id });
      if (error) throw error;
      setRemoveOpen(false);
      setRemoveUser(null);
      fetchUsers();
    } catch {
      setRemoveLoading(false);
    } finally {
      setRemoveLoading(false);
    }
  }

  function toggleAdminLocation(id: string, checked: boolean) {
    setCreateForm((p) => {
      const set = new Set(p.adminLocationIds);
      if (checked) set.add(id);
      else set.delete(id);
      return { ...p, adminLocationIds: [...set] };
    });
  }

  function toggleEditAdminLocation(id: string, checked: boolean) {
    setEditAdminLocationIds((prev) => {
      const set = new Set(prev);
      if (checked) set.add(id);
      else set.delete(id);
      return [...set];
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Locations &amp; logins</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Locations (single site), employees tied to one location, or administrators with multiple
            locations. Existing accounts stay as locations until you change them.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-red-600 hover:bg-red-700">
          <UserPlus className="size-4" />
          Create account
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="self-end sm:self-auto"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No accounts found.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-zinc-900">{u.name}</p>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700">
                      {accountTypeLabel(u.role)}
                    </span>
                    {u.banned && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500">User ID: {getUserId(u)}</p>
                  {isPendingLocationLogin(u) && (
                    <p className="text-sm text-amber-700">Login not set yet</p>
                  )}
                  {u.role === "client" && u.address?.trim() && (
                    <p className="text-sm text-zinc-500">Address: {u.address}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(u)}
                    className="shrink-0"
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openReset(u)}
                    className="shrink-0"
                  >
                    <RotateCcw className="size-4" />
                    {isPendingLocationLogin(u) ? "Set login" : "Reset password"}
                  </Button>
                  {u.banned ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnban(u)}
                      className="shrink-0"
                    >
                      <Unlock className="size-4" />
                      Unlock
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBan(u)}
                      className="shrink-0"
                    >
                      <Lock className="size-4" />
                      Lock
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openRemove(u)}
                    className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4" autoComplete="nope">
            {createError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</p>
            )}
            <div className="absolute -left-[9999px] opacity-0" aria-hidden>
              <input type="text" name="prevent_autofill" tabIndex={-1} autoComplete="nope" />
              <input type="password" name="prevent_autofill_pwd" tabIndex={-1} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label>Account type</Label>
              <Select
                value={createForm.accountKind}
                onValueChange={(v) =>
                  setCreateForm((p) => ({
                    ...p,
                    accountKind: v as AccountKind,
                    createLoginNow:
                      (v as AccountKind) === "location" ? p.createLoginNow : true,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="employee">Employee (one location)</SelectItem>
                  <SelectItem value="administrator">Administrator (multiple locations)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Full name"
                required
                autoComplete="nope"
              />
            </div>
            {createForm.accountKind === "location" && (
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={createForm.address}
                  onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Street, city, state, ZIP"
                  autoComplete="nope"
                />
              </div>
            )}
            {createForm.accountKind === "location" && (
              <div className="space-y-2">
                <Label>Customer type</Label>
                <Select
                  value={createForm.customerType}
                  onValueChange={(v) =>
                    setCreateForm((p) => ({
                      ...p,
                      customerType: v as "cot" | "lift" | "both",
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cot">Cot Medik</SelectItem>
                    <SelectItem value="lift">Lift Medik</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {createForm.accountKind === "location" && (
              <div className="space-y-2">
                <Label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={createForm.createLoginNow}
                    onCheckedChange={(checked) =>
                      setCreateForm((p) => ({
                        ...p,
                        createLoginNow: checked === true,
                        sendMagicLinkInvite: checked === true ? p.sendMagicLinkInvite : false,
                        inviteEmail: checked === true ? p.inviteEmail : "",
                      }))
                    }
                  />
                  <span>Create login now (optional)</span>
                </Label>
                {!createForm.createLoginNow && (
                  <p className="text-xs text-zinc-500">
                    You can create this location now and set login credentials later by opening Set
                    login on this account.
                  </p>
                )}
              </div>
            )}
            {createForm.accountKind === "employee" && (
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={createForm.employeeLocationId || "__none__"}
                  onValueChange={(v) =>
                    setCreateForm((p) => ({
                      ...p,
                      employeeLocationId: v === "__none__" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select location…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select…</SelectItem>
                    {locationOptions.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {createForm.accountKind === "administrator" && (
              <div className="space-y-2">
                <Label>Locations</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-3">
                  {locationOptions.length === 0 ? (
                    <p className="text-sm text-zinc-500">Create at least one location first.</p>
                  ) : (
                    locationOptions.map((loc) => (
                      <label key={loc.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={createForm.adminLocationIds.includes(loc.id)}
                          onCheckedChange={(c) => toggleAdminLocation(loc.id, c === true)}
                        />
                        <span>{loc.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
            {(createForm.accountKind !== "location" || createForm.createLoginNow) && (
              <>
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input
                    type="text"
                    value={createForm.userId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, userId: e.target.value }))}
                    placeholder="e.g. acme_corp"
                    required
                    autoComplete="nope"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={createForm.sendMagicLinkInvite}
                      onCheckedChange={(checked) =>
                        setCreateForm((p) => ({
                          ...p,
                          sendMagicLinkInvite: checked === true,
                          inviteEmail: checked === true ? p.inviteEmail : "",
                          password: checked === true ? "" : p.password,
                        }))
                      }
                    />
                    <span>Send magic link now</span>
                  </Label>
                  <p className="text-xs text-zinc-500">
                    Email is only for the one-time link. They keep using the User ID above on the
                    login page; a strong password is set automatically for that account.
                  </p>
                </div>
                {createForm.sendMagicLinkInvite && (
                  <div className="space-y-2">
                    <Label>Sign-in email (for magic link)</Label>
                    <Input
                      type="email"
                      value={createForm.inviteEmail}
                      onChange={(e) => setCreateForm((p) => ({ ...p, inviteEmail: e.target.value }))}
                      placeholder="name@company.com"
                      autoComplete="email"
                    />
                  </div>
                )}
                {!createForm.sendMagicLinkInvite && (
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      autoComplete="nope"
                    />
                  </div>
                )}
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading} className="bg-red-600 hover:bg-red-700">
                {createLoading ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit account type — {editUser?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            {editError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>
            )}
            <div className="space-y-2">
              <Label>Sign-in email</Label>
              <Input
                type="email"
                value={editSignInEmail}
                onChange={(e) => setEditSignInEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label>Account type</Label>
              <Select
                value={editKind}
                onValueChange={(v) => setEditKind(v as AccountKind)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="employee">Employee (one location)</SelectItem>
                  <SelectItem value="administrator">Administrator (multiple locations)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editKind === "location" && (
              <>
                <div className="space-y-2">
                  <Label>Customer / location name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Site or organization name"
                    autoComplete="organization"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Street, city, state, ZIP"
                    autoComplete="nope"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer type</Label>
                  <Select
                    value={editCustomerType}
                    onValueChange={(v) => setEditCustomerType(v as "cot" | "lift" | "both")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cot">Cot Medik</SelectItem>
                      <SelectItem value="lift">Lift Medik</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {editKind === "employee" && (
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={editEmployeeLocationId || "__none__"}
                  onValueChange={(v) => setEditEmployeeLocationId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select location…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select…</SelectItem>
                    {locationOptions.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editKind === "administrator" && (
              <div className="space-y-2">
                <Label>Locations</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-3">
                  {locationOptions.length === 0 ? (
                    <p className="text-sm text-zinc-500">No locations yet.</p>
                  ) : (
                    locationOptions.map((loc) => (
                      <label key={loc.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={editAdminLocationIds.includes(loc.id)}
                          onCheckedChange={(c) => toggleEditAdminLocation(loc.id, c === true)}
                        />
                        <span>{loc.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading} className="bg-red-600 hover:bg-red-700">
                {editLoading ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {resetUser && isPendingLocationLogin(resetUser) ? "Set login" : "Reset password"}
            </DialogTitle>
            <p className="text-sm text-zinc-500">
              {resetUser && isPendingLocationLogin(resetUser)
                ? `Set a User ID for ${resetUser.name}. With a magic link, we email a one-time sign-in; a password is set automatically so they can keep using User ID on the login page.`
                : `Set a new password for ${resetUser?.name ?? ""}.`}
            </p>
          </DialogHeader>
          <form onSubmit={handleReset} className="space-y-4">
            {resetError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{resetError}</p>
            )}
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input
                type="text"
                value={resetUserId}
                onChange={(e) => setResetUserId(e.target.value)}
                placeholder="e.g. acme_corp"
                required
                autoComplete="nope"
              />
            </div>
            {resetUser && isPendingLocationLogin(resetUser) && (
              <>
                <div className="space-y-2">
                  <Label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={resetSendMagicLink}
                      onCheckedChange={(checked) => {
                        setResetSendMagicLink(checked === true);
                        if (checked !== true) {
                          setResetInviteEmail("");
                        }
                        setResetPassword("");
                      }}
                    />
                    <span>Send magic link</span>
                  </Label>
                  <p className="text-xs text-zinc-500">
                    We set a random password in the background so User ID sign-in keeps working; the
                    link is only for first-time sign-in from email.
                  </p>
                </div>
                {resetSendMagicLink && (
                  <div className="space-y-2">
                    <Label>Sign-in email (for magic link)</Label>
                    <Input
                      type="email"
                      value={resetInviteEmail}
                      onChange={(e) => setResetInviteEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                    />
                  </div>
                )}
              </>
            )}
            {!(resetUser && isPendingLocationLogin(resetUser) && resetSendMagicLink) && (
              <div className="space-y-2">
                <Label>New password</Label>
                <Input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResetSendMagicLink(false);
                  setResetInviteEmail("");
                  setResetOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  resetLoading ||
                  !resetUserId.trim() ||
                  (resetUser &&
                    isPendingLocationLogin(resetUser) &&
                    resetSendMagicLink &&
                    (!resetInviteEmail.trim() ||
                      !INVITE_EMAIL_RE.test(resetInviteEmail.trim().toLowerCase()) ||
                      resetInviteEmail.trim().toLowerCase().endsWith("@cotmedic.local"))) ||
                  (!(resetUser && isPendingLocationLogin(resetUser) && resetSendMagicLink) &&
                    (!resetPassword || resetPassword.length < 8))
                }
                className="bg-red-600 hover:bg-red-700"
              >
                {resetLoading
                  ? resetUser && isPendingLocationLogin(resetUser) && resetSendMagicLink
                    ? "Saving…"
                    : resetUser && isPendingLocationLogin(resetUser)
                      ? "Saving…"
                      : "Resetting…"
                  : resetUser && isPendingLocationLogin(resetUser) && resetSendMagicLink
                    ? "Save & send link"
                    : resetUser && isPendingLocationLogin(resetUser)
                      ? "Save login"
                      : "Reset password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {removeUser?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
              disabled={removeLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {removeLoading ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
