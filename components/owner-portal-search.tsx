"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  ClipboardList,
  Database,
  LayoutDashboard,
  Search,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { OWNER_PORTAL_PAGES } from "@/lib/owner-portal-pages";
import type { PortalSearchGroup, PortalSearchItem } from "@/app/api/portal/search/route";

const headerIconBtn =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1";

function itemIcon(type: PortalSearchItem["type"]) {
  switch (type) {
    case "page":
      return LayoutDashboard;
    case "client":
      return Database;
    case "contact":
      return UserCircle;
    case "location":
      return Building2;
    case "employee":
      return Users;
    case "work_order":
      return ClipboardList;
    default:
      return Search;
  }
}

function defaultGroups(): PortalSearchGroup[] {
  return [
    {
      label: "Quick links",
      items: OWNER_PORTAL_PAGES.map((p) => ({
        id: `page:${p.href}`,
        type: "page" as const,
        title: p.label,
        href: p.href,
      })),
    },
  ];
}

export function OwnerPortalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<PortalSearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const flatItems = groups.flatMap((g) => g.items);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setGroups(defaultGroups());
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (open) {
          inputRef.current?.focus();
        } else {
          openPalette();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, openPalette]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setGroups(defaultGroups());
      setLoading(false);
      setActiveIndex(0);
      return;
    }

    setLoading(true);
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/portal/search?q=${encodeURIComponent(trimmed)}`
          );
          const data = (await res.json().catch(() => ({}))) as {
            groups?: PortalSearchGroup[];
          };
          if (res.ok) {
            setGroups(data.groups ?? []);
          } else {
            setGroups([]);
          }
        } catch {
          setGroups([]);
        } finally {
          setLoading(false);
          setActiveIndex(0);
        }
      })();
    }, 200);

    return () => window.clearTimeout(t);
  }, [query, open]);

  function navigate(item: PortalSearchItem) {
    setOpen(false);
    router.push(item.href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (flatItems.length ? (i + 1) % flatItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        flatItems.length ? (i - 1 + flatItems.length) % flatItems.length : 0
      );
    } else if (e.key === "Enter" && flatItems[activeIndex]) {
      e.preventDefault();
      navigate(flatItems[activeIndex]);
    }
  }

  let itemOffset = 0;

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Search portal"
        title="Search (Ctrl+S)"
        className={cn(headerIconBtn, "mr-2")}
      >
        <Search className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-lg"
          showCloseButton
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="border-b border-zinc-200 px-4 py-3">
            <DialogTitle className="sr-only">Search portal</DialogTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search clients, locations, work orders…"
                className="h-11 border-zinc-200 bg-zinc-50 pl-9 text-base"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <p className="text-xs text-zinc-500">
              <kbd className="rounded border border-zinc-200 bg-white px-1">↑</kbd>{" "}
              <kbd className="rounded border border-zinc-200 bg-white px-1">↓</kbd> navigate ·{" "}
              <kbd className="rounded border border-zinc-200 bg-white px-1">↵</kbd> open ·{" "}
              <kbd className="rounded border border-zinc-200 bg-white px-1">esc</kbd> close
            </p>
          </DialogHeader>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto py-2">
            {loading && (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">Searching…</p>
            )}
            {!loading && query.trim() && flatItems.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">
                No results for &ldquo;{query.trim()}&rdquo;
              </p>
            )}
            {!loading &&
              groups.map((group) => {
                const groupStart = itemOffset;
                const section = (
                  <div key={group.label} className="px-2 py-1">
                    <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {group.label}
                    </p>
                    <ul className="space-y-0.5">
                      {group.items.map((item, idx) => {
                        const globalIndex = groupStart + idx;
                        const Icon = itemIcon(item.type);
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                                globalIndex === activeIndex
                                  ? "bg-red-50 text-red-900"
                                  : "text-zinc-900 hover:bg-zinc-100"
                              )}
                              onMouseEnter={() => setActiveIndex(globalIndex)}
                              onClick={() => navigate(item)}
                            >
                              <span
                                className={cn(
                                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                                  globalIndex === activeIndex
                                    ? "bg-red-100 text-red-700"
                                    : "bg-zinc-100 text-zinc-600"
                                )}
                              >
                                <Icon className="size-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{item.title}</span>
                                {item.subtitle ? (
                                  <span className="block truncate text-xs text-zinc-500">
                                    {item.subtitle}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
                itemOffset += group.items.length;
                return section;
              })}
          </div>

          <div className="flex items-center gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-500">
            <Wrench className="size-3.5 shrink-0" />
            <BarChart3 className="size-3.5 shrink-0" />
            <span>Search across dashboard, CRM, locations, team, and work orders</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
