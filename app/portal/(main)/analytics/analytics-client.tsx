"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ANALYTICS_TIME_ZONE, getMondaySundayUtcIsoRange } from "@/lib/week-bounds-ny";
import { formatYmdNY } from "@/lib/ny-calendar";
import { cn } from "@/lib/utils";

type TechnicianMetricsResponse = {
  workType: "cot" | "lift" | "both";
  timeZone: string;
  chart: "technician" | "month";
  dateRange: { from: string; to: string };
  rangeUtc: { start: string; endExclusive: string };
  bars: { key: string; name: string; count: number }[];
  lastSubmission: {
    technicianId: string;
    technicianName: string;
    submittedAt: string;
  } | null;
  missingInRange: { id: string; name: string }[];
};

function thisWeekDateRange(): DateRange {
  const { start, end } = getMondaySundayUtcIsoRange();
  return { from: new Date(start), to: new Date(end) };
}

function formatRangeButton(from: Date, to: Date): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ANALYTICS_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fmt.format(from)} – ${fmt.format(to)}`;
}

function workTypeShortLabel(w: "cot" | "lift" | "both"): string {
  if (w === "both") return "Cot & Lift";
  return w === "cot" ? "Cot Medik" : "Lift Medik";
}

export function AnalyticsPageClient() {
  const [workType, setWorkType] = useState<"cot" | "lift" | "both">("both");
  const [chartMode, setChartMode] = useState<"technician" | "month">("technician");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => thisWeekDateRange());
  const [rangeOpen, setRangeOpen] = useState(false);
  const [technicianId, setTechnicianId] = useState<string>("all");
  const [technicians, setTechnicians] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<TechnicianMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthsShown, setMonthsShown] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setMonthsShown(mq.matches ? 2 : 1);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/technicians")
      .then((r) => r.json())
      .then((json: { technicians?: { id: string; name: string }[] }) => {
        if (!cancelled) setTechnicians(json.technicians ?? []);
      })
      .catch(() => {
        if (!cancelled) setTechnicians([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rangeYmd = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return null;
    return { from: formatYmdNY(dateRange.from), to: formatYmdNY(dateRange.to) };
  }, [dateRange]);

  const loadMetrics = useCallback(async () => {
    if (!rangeYmd) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: workType,
        chart: chartMode,
        from: rangeYmd.from,
        to: rangeYmd.to,
      });
      if (technicianId && technicianId !== "all") params.set("technicianId", technicianId);
      const res = await fetch(`/api/analytics/technician-metrics?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body.error === "string" ? body.error : "Failed to load analytics");
      }
      const json = (await res.json()) as TechnicianMetricsResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [workType, technicianId, chartMode, rangeYmd]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const rangeLabel = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return "";
    return formatRangeButton(dateRange.from, dateRange.to);
  }, [dateRange]);

  const chartRows = useMemo(
    () =>
      (data?.bars ?? []).map((b) => ({
        ...b,
        label: String(b.count),
      })),
    [data?.bars]
  );

  const lastSubmissionDescription = useMemo(() => {
    if (!data) return "";
    return `Latest qualifying ${workTypeShortLabel(data.workType)} report in the selected range.`;
  }, [data]);

  const chartCardTitle = (() => {
    if (!data) return "Reports";
    if (data.chart === "month") {
      return "Reports by month";
    }
    return "Reports by assigned technician";
  })();

  const chartCardDescription = (() => {
    if (!data) return "";
    if (data.chart === "month") {
      return `Count per calendar month within the range (${ANALYTICS_TIME_ZONE.replace("_", " ")}).`;
    }
    return `Totals for ${workTypeShortLabel(data.workType)} in the selected range (technician-submitted only).`;
  })();

  return (
    <div className="flex w-full max-w-none flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <Tabs
            value={workType}
            onValueChange={(v) => setWorkType(v as "cot" | "lift" | "both")}
            className="w-full lg:w-auto"
          >
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:min-w-[min(100%,28rem)]">
              <TabsTrigger value="both">Both</TabsTrigger>
              <TabsTrigger value="cot">Cot Medik</TabsTrigger>
              <TabsTrigger value="lift">Lift Medik</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs
            value={chartMode}
            onValueChange={(v) => setChartMode(v as "technician" | "month")}
            className="w-full lg:w-auto"
          >
            <TabsList className="grid w-full grid-cols-2 lg:w-auto">
              <TabsTrigger value="technician">By technician</TabsTrigger>
              <TabsTrigger value="month">By month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-600">Date range (Eastern)</span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal sm:min-w-[280px] lg:max-w-md",
                      !rangeYmd && "text-zinc-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4 shrink-0 opacity-60" />
                    {rangeYmd && dateRange?.from && dateRange.to
                      ? rangeLabel
                      : "Select start and end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    numberOfMonths={monthsShown}
                    selected={dateRange}
                    onSelect={(r) => setDateRange(r)}
                    defaultMonth={dateRange?.from}
                  />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="secondary"
                className="w-full shrink-0 sm:w-auto"
                onClick={() => {
                  setDateRange(thisWeekDateRange());
                }}
              >
                This week
              </Button>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1 lg:max-w-xs">
            <span className="text-xs font-medium text-zinc-600">Technician</span>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger className="w-full border-zinc-200 bg-white">
                <SelectValue placeholder="All technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All technicians</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!rangeYmd ? (
        <p className="text-center text-sm text-zinc-500">Choose a start and end date to load analytics.</p>
      ) : loading ? (
        <p className="text-center text-sm text-zinc-500">Loading…</p>
      ) : error ? (
        <p className="text-center text-sm text-red-600">{error}</p>
      ) : (
        <>
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader>
              <CardTitle>{chartCardTitle}</CardTitle>
              <CardDescription>{chartCardDescription}</CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100dvh-18rem)] min-h-[280px] pt-2 sm:h-[calc(100dvh-15rem)]">
              {chartRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">No data in this range.</p>
              ) : data?.chart === "month" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={chartRows.length > 6 ? -30 : 0}
                      textAnchor={chartRows.length > 6 ? "end" : "middle"}
                      height={chartRows.length > 6 ? 56 : 32}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(244, 244, 245, 0.6)" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e4e4e7",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="#b91c1c" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      <LabelList dataKey="label" position="top" fontSize={11} fill="#52525b" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={chartRows}
                    margin={{ top: 8, right: 28, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={132}
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(244, 244, 245, 0.6)" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e4e4e7",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="#b91c1c" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      <LabelList dataKey="label" position="right" fontSize={11} fill="#52525b" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Most recent technician submission</CardTitle>
                <CardDescription>{lastSubmissionDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.lastSubmission ? (
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-zinc-900">{data.lastSubmission.technicianName}</p>
                    <p className="text-zinc-600">
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: ANALYTICS_TIME_ZONE,
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(data.lastSubmission.submittedAt))}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">None in this range.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-zinc-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">No submission in range</CardTitle>
                <CardDescription>
                  Technicians with no qualifying report between {rangeLabel}. Uses the same filters as
                  the chart.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data?.missingInRange?.length ? (
                  <ul className="max-h-48 space-y-1.5 overflow-y-auto text-sm">
                    {data.missingInRange.map((t) => (
                      <li key={t.id} className="text-zinc-800">
                        {t.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500">Everyone submitted at least once in this range.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
