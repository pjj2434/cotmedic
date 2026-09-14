"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, History, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { printWorkOrderContent } from "@/lib/print-work-order";
import type {
  EquipmentHistoryRow,
  EquipmentInventoryRow,
} from "@/lib/equipment-reports";

type ReportTab = "equipment" | "history";

type LocationOption = { id: string; name: string };

function displayOrDash(value: string): string {
  return value.trim() ? value.trim() : "—";
}

function ReportPrintHeader({
  title,
  recordCount,
}: {
  title: string;
  recordCount: number;
}) {
  return (
    <div className="report-header mb-5 w-full border-b-2 border-black pb-3">
      <div className="flex w-full flex-col items-center gap-3 text-center">
        <div className="report-header-logos flex w-full items-center justify-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cotlogo.png"
            alt="Cot Medik"
            width={96}
            height={22}
            className="report-logo h-[22px] w-[96px] object-contain"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/liftlogo.png"
            alt="Lift Medik"
            width={96}
            height={22}
            className="report-logo h-[22px] w-[96px] object-contain"
          />
        </div>
        <div className="w-full">
          <p className="text-lg font-bold tracking-wide">{title}</p>
          <p className="text-xs text-zinc-700">
            Generated {new Date().toLocaleDateString()} · {recordCount} record
            {recordCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ReportsClient() {
  const [tab, setTab] = useState<ReportTab>("equipment");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<EquipmentHistoryRow[]>([]);
  const [equipment, setEquipment] = useState<EquipmentInventoryRow[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationFilter, setLocationFilter] = useState("__all__");
  const [query, setQuery] = useState("");
  const [printRunId, setPrintRunId] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/reports");
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as {
        history?: EquipmentHistoryRow[];
        equipment?: EquipmentInventoryRow[];
        locations?: LocationOption[];
      };
      setHistory(Array.isArray(data.history) ? data.history : []);
      setEquipment(Array.isArray(data.equipment) ? data.equipment : []);
      setLocations(Array.isArray(data.locations) ? data.locations : []);
    } catch {
      setHistory([]);
      setEquipment([]);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (printRunId === 0) return;
    if (printRef.current) printWorkOrderContent(printRef.current);
  }, [printRunId]);

  const filteredEquipment = useMemo(() => {
    const q = query.trim().toLowerCase();
    return equipment.filter((row) => {
      if (locationFilter !== "__all__" && row.locationId !== locationFilter) return false;
      if (!q) return true;
      const hay = [row.locationName, row.serial, row.unit].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [equipment, locationFilter, query]);

  const filteredHistory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((row) => {
      if (locationFilter !== "__all__" && row.locationId !== locationFilter) return false;
      if (!q) return true;
      const hay = [
        row.dateLabel,
        row.locationName,
        row.serial,
        row.unit,
        row.source === "checklist" ? "checklist" : "work order",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [history, locationFilter, query]);

  const activeCount =
    tab === "equipment" ? filteredEquipment.length : filteredHistory.length;
  const printTitle =
    tab === "equipment" ? "Equipment Export" : "Service History";

  const showLocationFilter = locations.length > 1;

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-linear-to-br from-white via-zinc-50 to-red-50/40 shadow-sm ring-1 ring-zinc-200/60">
        <div className="px-5 py-6 sm:px-7 sm:py-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-600">
            Reports
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Equipment &amp; service
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Printable lists from your work orders and checklists — equipment roster without
            duplicate dates, plus full service history with every service date.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTab("equipment")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === "equipment"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <FileSpreadsheet className="size-4" />
            Equipment export
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === "history"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <History className="size-4" />
            Service history
          </button>
        </div>
        <Button
          type="button"
          className="bg-red-600 hover:bg-red-700"
          disabled={loading || activeCount === 0}
          onClick={() => setPrintRunId((n) => n + 1)}
        >
          <Printer className="mr-2 size-4" />
          Print {tab === "equipment" ? "export" : "history"}
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                {tab === "equipment" ? "Equipment export" : "Service history"}
              </h2>
              <p className="text-xs text-zinc-500">
                {tab === "equipment"
                  ? "One row per unit at each location (serial + ambulance/bus)."
                  : "Every checklist and work-order service date for your locations."}
              </p>
            </div>
            <p className="text-xs font-medium text-zinc-500">
              {loading ? "Loading…" : `${activeCount} row${activeCount === 1 ? "" : "s"}`}
            </p>
          </div>

          <div
            className={cn(
              "mt-3 grid gap-2",
              showLocationFilter ? "sm:grid-cols-2" : "sm:grid-cols-1"
            )}
          >
            {showLocationFilter && (
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Location</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All locations</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-[11px] text-zinc-500">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Serial, unit, location…"
                  className="h-9 pl-8"
                />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-zinc-500">Loading reports…</p>
        ) : tab === "equipment" ? (
          filteredEquipment.length === 0 ? (
            <p className="p-8 text-center text-sm text-zinc-500">
              No equipment records found for your locations.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
                    <th className="px-4 py-2.5 sm:px-5">Location</th>
                    <th className="px-4 py-2.5">Serial number</th>
                    <th className="px-4 py-2.5">Ambulance / bus</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipment.map((row, i) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-zinc-100",
                        i % 2 === 1 && "bg-zinc-50/70"
                      )}
                    >
                      <td className="px-4 py-2.5 font-medium text-zinc-900 sm:px-5">
                        {displayOrDash(row.locationName)}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-700">
                        {displayOrDash(row.serial)}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-700">
                        {displayOrDash(row.unit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredHistory.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">
            No service history found for your locations.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
                  <th className="px-4 py-2.5 sm:px-5">Date</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Serial number</th>
                  <th className="px-4 py-2.5">Ambulance / bus</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((row, i) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-zinc-100",
                      i % 2 === 1 && "bg-zinc-50/70"
                    )}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap font-medium text-zinc-900 sm:px-5">
                      {row.dateLabel}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-700">
                      {displayOrDash(row.locationName)}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-700">
                      {displayOrDash(row.serial)}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-700">
                      {displayOrDash(row.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print-only sheet */}
      <div className="pointer-events-none fixed top-0 left-[-10000px] opacity-0" aria-hidden>
        <div ref={printRef} className="print-root">
          <div className="report-print-sheet bg-white text-black">
            <ReportPrintHeader title={printTitle} recordCount={activeCount} />
            {tab === "equipment" ? (
              <table className="report-data-table w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Serial number</th>
                    <th>Ambulance / bus</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipment.map((row, i) => (
                    <tr key={row.id} className={cn(i % 2 === 1 && "report-row-alt")}>
                      <td>{displayOrDash(row.locationName)}</td>
                      <td>{displayOrDash(row.serial)}</td>
                      <td>{displayOrDash(row.unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="report-data-table w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Serial number</th>
                    <th>Ambulance / bus</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((row, i) => (
                    <tr key={row.id} className={cn(i % 2 === 1 && "report-row-alt")}>
                      <td>{row.dateLabel}</td>
                      <td>{displayOrDash(row.locationName)}</td>
                      <td>{displayOrDash(row.serial)}</td>
                      <td>{displayOrDash(row.unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
