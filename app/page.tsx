"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && session) {
      router.push("/portal");
    }
  }, [session, isPending, router]);

  if (!isPending && session) {
    return null;
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

    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    if (data) {
      router.push("/portal");
      router.refresh();
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-100">
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

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6">
        {/* Logos on light panel so dark marks remain visible */}
        <div className="mb-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-lg ring-1 ring-zinc-200">
          <Image
            src="/cotlogo.png"
            alt="Cot Medik Inc."
            width={220}
            height={72}
            priority
            className="h-auto w-[200px] sm:w-[240px]"
          />
          <Image
            src="/liftlogo.jpeg"
            alt="Lift Medik"
            width={220}
            height={72}
            priority
            className="h-auto w-[200px] sm:w-[240px]"
          />
        </div>

        <Card className="w-full border-zinc-200 bg-white shadow-xl ring-1 ring-zinc-200/80">
          <CardHeader className="space-y-1 pb-6 text-center">
            <CardTitle className="text-xl font-semibold text-zinc-900">
              Customer Portal Login
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Enter your credentials to access the portal
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full bg-red-600 font-medium text-white hover:bg-red-700 focus-visible:ring-red-500/30"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-zinc-500">
          © {new Date().getFullYear()} Cot/Liftmedik. All rights reserved.
        </p>
      </div>
    </div>
  );
}
