import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-red-700 hover:underline">
            ← Cot/Lift Medik Portal
          </Link>
          <p className="text-xs text-zinc-500">Last updated {lastUpdated}</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-700 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_a]:text-red-700 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-4 [&_ul]:space-y-2">
          {children}
        </div>
      </main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href="/privacy" className="hover:text-zinc-800 hover:underline">
            Privacy Policy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-zinc-800 hover:underline">
            Terms of Use
          </Link>
        </p>
        <p className="mt-2">© {new Date().getFullYear()} Cot/Lift Medik. All rights reserved.</p>
      </footer>
    </div>
  );
}
