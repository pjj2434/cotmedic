"use client";

import { useState, useEffect, useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Search, UserPlus, RotateCcw, X, Lock, Unlock, Trash2 } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role?: string;
  banned?: boolean;
  customerType?: string;
};

export function CustomersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    userId: "",
    password: "",
    customerType: "cot" as "cot" | "lift" | "both",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [resetError, setResetError] = useState("");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeUser, setRemoveUser] = useState<User | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  function getUserId(u: User) {
    if (u.username?.trim()) return u.username;
    return u.email.replace(/@cotmedic\.local$/i, "");
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await authClient.admin.listUsers({
        query: {
          filterField: "role",
          filterValue: "client",
          filterOperator: "eq",
          limit: 500,
          ...(search.trim()
            ? {
                searchValue: search.trim(),
                searchField: "name" as const,
                searchOperator: "contains" as const,
              }
            : {}),
        },
      });
      setUsers((res as { users?: User[] })?.users ?? []);
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
    setCreateLoading(true);
    try {
      const username = createForm.userId.trim().toLowerCase();
      const { data, error } = await authClient.admin.createUser({
        email: `${username}@cotmedic.local`,
        password: createForm.password,
        name: createForm.name.trim(),
        // @ts-expect-error - admin plugin types default to user|admin; we use custom roles
        role: "client",
        data: { resetPassword: true, username, customerType: createForm.customerType },
      });
      if (error) {
        setCreateError((error as { message?: string })?.message ?? "Failed to create customer");
        return;
      }
      if (data) {
        setCreateOpen(false);
        setCreateForm({ name: "", userId: "", password: "", customerType: "cot" });
        fetchUsers();
      }
    } catch {
      setCreateError("Failed to create customer");
    } finally {
      setCreateLoading(false);
    }
  }

  function openReset(u: User) {
    setResetUser(u);
    setResetPassword("");
    setResetError("");
    setResetOpen(true);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUser) return;
    if (!resetPassword || resetPassword.length < 8) {
      setResetError("Password must be at least 8 characters");
      return;
    }
    setResetError("");
    setResetLoading(true);
    try {
      const { error } = await authClient.admin.setUserPassword({
        userId: resetUser.id,
        newPassword: resetPassword,
      });
      if (error) {
        setResetError((error as { message?: string })?.message ?? "Failed to reset password");
        return;
      }
      await authClient.admin.revokeUserSessions({ userId: resetUser.id });
      await authClient.admin.updateUser({
        userId: resetUser.id,
        data: { resetPassword: true },
      });
      setResetOpen(false);
      setResetUser(null);
    } catch {
      setResetError("Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleBan(user: User) {
    try {
      const { error } = await authClient.admin.banUser({ userId: user.id });
      if (error) throw error;
      fetchUsers();
    } catch {
      // Ignore for now
    }
  }

  async function handleUnban(user: User) {
    try {
      const { error } = await authClient.admin.unbanUser({ userId: user.id });
      if (error) throw error;
      fetchUsers();
    } catch {
      // Ignore for now
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Customers</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage customer accounts.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-red-600 hover:bg-red-700">
          <UserPlus className="size-4" />
          Create customer
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
            className="sm:self-auto self-end"
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
          <div className="p-8 text-center text-zinc-500">No customers found.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-900">{u.name}</p>
                    {u.banned && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500">User ID: {getUserId(u)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openReset(u)}
                    className="shrink-0"
                  >
                    <RotateCcw className="size-4" />
                    Reset password
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4" autoComplete="nope">
            {createError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</p>
            )}
            {/* Hidden fields to prevent Chrome from autofilling the real inputs */}
            <div className="absolute -left-[9999px] opacity-0" aria-hidden>
              <input type="text" name="prevent_autofill" tabIndex={-1} autoComplete="nope" />
              <input type="password" name="prevent_autofill_pwd" tabIndex={-1} autoComplete="new-password" />
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

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <p className="text-sm text-zinc-500">
              Set a new password for {resetUser?.name ?? ""}.
            </p>
          </DialogHeader>
          <form onSubmit={handleReset} className="space-y-4">
            {resetError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{resetError}</p>
            )}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={resetLoading || !resetPassword || resetPassword.length < 8}
                className="bg-red-600 hover:bg-red-700"
              >
                {resetLoading ? "Resetting…" : "Reset password"}
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
              This will permanently delete {removeUser?.name}. This action
              cannot be undone.
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
