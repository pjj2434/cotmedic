"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateNewPassword } from "@/lib/password-policy";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tokenError = searchParams.get("error");
  const token = searchParams.get("token");

  if (tokenError === "INVALID_TOKEN") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-700">This reset link is invalid or has expired.</p>
        <Link href="/" className="text-sm font-medium text-red-600 underline underline-offset-2 hover:text-red-700">
          Back to login
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center text-sm text-zinc-600">
        <p>
          Missing reset token. Use the link from your email, or request a new reset from the login page.
        </p>
        <Link href="/" className="font-medium text-red-600 underline underline-offset-2 hover:text-red-700">
          Back to login
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    const v = validateNewPassword(password);
    if (v) {
      setError(v);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: resetErr } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);
    if (resetErr) {
      setError(resetErr.message ?? "Could not reset password.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-zinc-700">Your password was updated. You can sign in now.</p>
        <Button asChild className="h-11 bg-red-600 hover:bg-red-700">
          <Link href="/">Go to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="new-password" className="text-zinc-700">
          New password
        </Label>
        <Input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          disabled={loading}
          className="h-11 border-zinc-300 bg-white"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-zinc-700">
          Confirm new password
        </Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          disabled={loading}
          className="h-11 border-zinc-300 bg-white"
        />
      </div>
      <p className="text-xs text-zinc-500">
        At least 8 characters, one capital letter, and one special character (!@#$%^&*…).
      </p>
      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full bg-red-600 font-medium text-white hover:bg-red-700"
      >
        {loading ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-12 lg:flex-row lg:items-center lg:gap-16">
        <Image
          src="/cotlogo.png"
          alt="Cot Medik"
          width={200}
          height={70}
          className="h-auto w-[min(200px,55vw)] shrink-0"
        />
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-zinc-900">Set new password</h1>
          <p className="mt-1 text-sm text-zinc-500">Choose a password for your portal account.</p>
          <div className="mt-6">
            <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
              <ResetPasswordInner />
            </Suspense>
          </div>
        </div>
        <Image
          src="/liftlogo.png"
          alt="Lift Medik"
          width={200}
          height={70}
          className="h-auto w-[min(200px,55vw)] shrink-0"
        />
      </div>
    </div>
  );
}
