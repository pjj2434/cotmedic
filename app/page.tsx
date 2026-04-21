"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (!isPending && session) {
      setIsRedirecting(true);
      window.location.replace("/portal");
    }
  }, [isPending, session]);

  if (isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-600">
        Redirecting to portal...
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { data, error: signInError } = await authClient.signIn.username({
      username: userId.trim(),
      password,
      rememberMe: true,
      callbackURL: "/portal",
    });

    setIsLoading(false);

    if (signInError) {
      const msg =
        (signInError as { code?: string }).code === "BANNED_USER"
          ? "Your account has been locked. Please contact support."
          : signInError.message ?? "Invalid user ID or password";
      setError(msg);
      return;
    }

    setIsRedirecting(true);
    window.location.assign("/portal");
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    const email = forgotEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setForgotError("Enter a valid email address.");
      return;
    }
    setForgotLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetErr } = await authClient.requestPasswordReset({
        email,
        redirectTo,
      });
      if (resetErr) {
        setForgotError(resetErr.message ?? "Could not send reset email.");
        return;
      }
      setForgotSent(true);
    } catch {
      setForgotError("Something went wrong. Try again later.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-zinc-100 lg:flex-row">
      {/* Subtle ECG-like accent line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg
          className="absolute bottom-0 left-0 right-0 h-32 w-full opacity-[0.08]"
          preserveAspectRatio="none"
          viewBox="0 0 400 40"
        >
          <path
            d="M0 20 Q 25 5, 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20 T 350 20 T 400 20"
            fill="none"
            stroke="#dc2626"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Cot Medik — left on desktop, top on mobile */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-8 lg:min-h-0 lg:py-12">
        <Image
          src="/cotlogo.png"
          alt="Cot Medik Inc."
          width={220}
          height={72}
          priority
          className="h-auto w-[min(200px,70vw)] sm:w-[220px]"
        />
      </div>

      {/* Login — center */}
      <div className="relative z-10 flex w-full shrink-0 flex-col justify-center px-6 py-10 lg:w-[min(100%,26rem)] lg:px-8">
        <div className="w-full space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold text-zinc-900">Customer Portal Login</h1>
            <p className="text-sm text-zinc-500">Enter your credentials to access the portal</p>
          </div>
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
                <Label htmlFor="userId" className="text-zinc-700">
                  User ID
                </Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="Enter your user ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  autoComplete="username"
                  disabled={isLoading}
                  className="h-11 border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus-visible:border-red-500 focus-visible:ring-red-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="h-11 border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus-visible:border-red-500 focus-visible:ring-red-500/20"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(true);
                    setForgotEmail("");
                    setForgotError(null);
                    setForgotSent(false);
                  }}
                  className="text-sm font-medium text-red-600 underline-offset-2 hover:text-red-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full bg-red-600 font-medium text-white hover:bg-red-700 focus-visible:ring-red-500/30"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
          </form>

          <Dialog
            open={forgotOpen}
            onOpenChange={(open) => {
              setForgotOpen(open);
              if (!open) {
                setForgotEmail("");
                setForgotError(null);
                setForgotSent(false);
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reset password</DialogTitle>
                <DialogDescription>
                  Enter the email on your portal account. If it matches a Medik Records user, we will email
                  you a link to choose a new password.
                </DialogDescription>
              </DialogHeader>
              {forgotSent ? (
                <p className="text-sm text-zinc-600">
                  If an account exists for that email, you will receive a reset link shortly. Check your inbox
                  and spam folder.
                </p>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  {forgotError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                      {forgotError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-zinc-700">
                      Email
                    </Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={forgotLoading}
                      className="h-11 border-zinc-300 bg-white"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="h-11 w-full bg-red-600 hover:bg-red-700"
                  >
                    {forgotLoading ? "Sending…" : "Send reset link"}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          © {new Date().getFullYear()} Cot/Liftmedik. All rights reserved.
        </p>
      </div>

      {/* Lift Medik — right on desktop, bottom on mobile */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-8 lg:min-h-0 lg:py-12">
        <Image
          src="/liftlogo.png"
          alt="Lift Medik"
          width={220}
          height={72}
          priority
          className="h-auto w-[min(200px,70vw)] sm:w-[220px]"
        />
      </div>
    </div>
  );
}
