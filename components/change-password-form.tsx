"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return "At least 8 characters";
  if (!/[A-Z]/.test(pwd)) return "At least one capital letter";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd))
    return "At least one special character (!@#$%^&*...)";
  return null;
}

function getPasswordStrength(pwd: string): { score: number; label: string } {
  if (!pwd) return { score: 0, label: "" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) score++;
  if (score <= 1) return { score: 1, label: "Weak" };
  if (score <= 3) return { score: 2, label: "Fair" };
  if (score <= 4) return { score: 3, label: "Good" };
  return { score: 4, label: "Strong" };
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  id?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-10 pr-10 md:h-11 md:text-base md:pr-11"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 md:right-3.5"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4 md:size-5" /> : <Eye className="size-4 md:size-5" />}
      </button>
    </div>
  );
}

const copy = {
  forced: {
    title: "Change your password",
    description: "You must set a new password before continuing.",
  },
  voluntary: {
    title: "Change password",
    description:
      "Enter your current password and choose a new one. You will stay signed in after saving.",
  },
} as const;

export function ChangePasswordForm({ variant }: { variant: "forced" | "voluntary" }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { title, description } = copy[variant];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(`New password: ${validationError}`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }
    setLoading(true);
    try {
      const { error: changeError } = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (changeError) {
        setError((changeError as { message?: string })?.message ?? "Failed to change password");
        return;
      }
      const res = await fetch("/api/clear-reset-password", { method: "POST" });
      if (!res.ok) {
        setError("Password changed but please sign in again.");
        return;
      }
      window.location.assign("/portal");
    } catch {
      setError("Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 md:max-w-xl md:px-8 md:py-12">
      <Card className="border-zinc-200 shadow-lg ring-1 ring-zinc-200/50 md:rounded-2xl">
        <CardHeader className="space-y-2 px-6 pt-8 md:px-10 md:pt-10">
          <CardTitle className="text-xl md:text-2xl">{title}</CardTitle>
          <CardDescription className="text-sm md:text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-10 md:px-10 md:pb-12">
          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 md:px-4 md:py-3">
                {error}
              </p>
            )}
            <div className="space-y-2 md:space-y-2.5">
              <Label htmlFor="current-password" className="text-sm md:text-base">
                Current password
              </Label>
              <PasswordInput
                id="current-password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2 md:space-y-2.5">
              <Label htmlFor="new-password" className="text-sm md:text-base">
                New password
              </Label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {newPassword && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors md:h-2",
                          i <= getPasswordStrength(newPassword).score
                            ? i === 1
                              ? "bg-red-500"
                              : i === 2
                                ? "bg-amber-500"
                                : i === 3
                                  ? "bg-lime-500"
                                  : "bg-emerald-600"
                            : "bg-zinc-200"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Strength: {getPasswordStrength(newPassword).label}
                  </p>
                </div>
              )}
              <p className="text-xs text-zinc-500 md:text-sm">
                At least 8 characters, one capital letter, and one special character (!@#$%^&*...)
              </p>
            </div>
            <div className="space-y-2 md:space-y-2.5">
              <Label htmlFor="confirm-password" className="text-sm md:text-base">
                Confirm new password
              </Label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              disabled={
                loading ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                newPassword !== confirmPassword ||
                !!validatePassword(newPassword)
              }
              className="h-11 w-full bg-red-600 text-base font-medium hover:bg-red-700 md:h-12 md:text-base"
            >
              {loading ? "Updating…" : "Change password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
