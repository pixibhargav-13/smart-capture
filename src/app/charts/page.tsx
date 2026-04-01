"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/context";
import { BarChart3, TrendingUp, Clock, Activity, ChevronDown } from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────

function pcsPerHour(cycleTimeSeconds: number | null, partsCount: number | null, intervalMinutes: number): number | null {
  // Best: cycle time → exact pcs/hr
  if (cycleTimeSeconds && cycleTimeSeconds > 0) return Math.round(3600 / cycleTimeSeconds);
  // Fallback: partsCount over the capture interval
  if (partsCount && partsCount > 0 && intervalMinutes > 0) return Math.round(partsCount / (intervalMinutes / 60));
  return null;
}

// Date-range filter helper — returns entries within last N hours
function withinHours(isoDate: string, hours: number): boolean {
  return Date.now() - new Date(isoDate).getTime() <= hours * 3_600_000;
}

// SVG bar chart — pure, no external libs
interface BarChartProps {
  data: { label: string; value: number; sub?: string }[];
  color: string;
  unit: string;
  height?: number;
}
function BarChart({ data, color, unit, height = 180 }: BarChartProps) {
  if (data.length === 0) return <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.min(48, Math.floor(560 / data.length) - 8);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${Math.max(560, data.length * (barW + 12))} ${height + 60}`}
        className="w-full"
        style={{ minWidth: data.length * (barW + 12) }}
      >
        {/* y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = (height - 10) * (1 - frac) + 5;
          const val = Math.round(max * frac);
          return (
            <g key={frac}>
              <line x1={36} x2="100%" y1={y} y2={y} stroke="#f0f0f0" strokeWidth={1} />
              <text x={32} y={y + 4} textAnchor="end" fontSize={9} fill="#aaa">{val}</text>
            </g>
          );
        })}

        {/* bars */}
        {data.map((d, i) => {
          const barH = Math.max(4, ((d.value / max) * (height - 16)));
          const x = 42 + i * (barW + 10);
          const y = height - barH - 10;
          const mid = x + barW / 2;
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barW} height={barH} rx={4} fill={color} opacity={0.85} />
              {/* value label on top */}
              <text x={mid} y={y - 4} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#374151">
                {d.value}
              </text>
              {/* x label */}
              <text x={mid} y={height + 10} textAnchor="middle" fontSize={10} fill="#6b7280" fontWeight="600">
                {d.label.length > 8 ? d.label.slice(0, 8) + "…" : d.label}
              </text>
              {d.sub && (
                <text x={mid} y={height + 22} textAnchor="middle" fontSize={8} fill="#9ca3af">
                  {d.sub}
                </text>
              )}
            </g>
          );
        })}

        {/* unit label */}
        <text x={36} y={height + 48} fontSize={9} fill="#9ca3af" fontStyle="italic">{unit}</text>
      </svg>
    </div>
  );
}

// Trend sparkline — last N entries for a single entity
interface SparklineProps {
  values: number[];
  color: string;
}
function Sparkline({ values, color }: SparklineProps) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 80, h = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

type Range = "8h" | "24h" | "7d" | "all";

export default function ChartsPage() {
  const { productionEntries, machines, employees, settings } = useApp();
  const [tab, setTab] = useState<"machine" | "employee">("machine");
  const [range, setRange] = useState<Range>("24h");

  // Filter entries by range
  const filtered = useMemo(() => {
    const rangeHours: Record<Range, number> = { "8h": 8, "24h": 24, "7d": 168, "all": 99999 };
    return productionEntries.filter((e) => withinHours(e.capturedAt, rangeHours[range]));
  }, [productionEntries, range]);

  // ── BY MACHINE ──────────────────────────────────────────────────────────
  const machineData = useMemo(() => {
    return machines.map((m) => {
      const entries = filtered.filter((e) => e.machineId === m.id);
      if (entries.length === 0) return null;

      // Best cycle time: median of non-null cycleTimeSeconds values
      const ctSamples = entries.map((e) => e.cycleTimeSeconds).filter((v): v is number => v != null && v > 0);
      const medianCt = ctSamples.length > 0
        ? ctSamples.sort((a, b) => a - b)[Math.floor(ctSamples.length / 2)]
        : null;

      // Fallback: average partsCount / interval
      const avgParts = entries.reduce((s, e) => s + (e.partsCount ?? 0), 0) / entries.length;
      const rate = pcsPerHour(medianCt, avgParts, settings.captureIntervalMinutes);

      // Trend: pcs/hr per capture (chronological)
      const trend = [...entries]
        .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
        .map((e) => pcsPerHour(e.cycleTimeSeconds, e.partsCount, settings.captureIntervalMinutes) ?? 0);

      const totalParts = entries.reduce((s, e) => s + (e.partsCount ?? 0), 0);

      return { id: m.id, label: m.name, value: rate ?? 0, sub: m.type, trend, totalParts, entries: entries.length };
    }).filter(Boolean) as { id: string; label: string; value: number; sub: string; trend: number[]; totalParts: number; entries: number }[];
  }, [filtered, machines, settings.captureIntervalMinutes]);

  // ── BY EMPLOYEE ─────────────────────────────────────────────────────────
  const employeeData = useMemo(() => {
    return employees.map((emp) => {
      const entries = filtered.filter((e) => e.operatorName === emp.name);
      if (entries.length === 0) return null;

      const ctSamples = entries.map((e) => e.cycleTimeSeconds).filter((v): v is number => v != null && v > 0);
      const medianCt = ctSamples.length > 0
        ? ctSamples.sort((a, b) => a - b)[Math.floor(ctSamples.length / 2)]
        : null;

      const avgParts = entries.reduce((s, e) => s + (e.partsCount ?? 0), 0) / entries.length;
      const rate = pcsPerHour(medianCt, avgParts, settings.captureIntervalMinutes);

      const trend = [...entries]
        .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
        .map((e) => pcsPerHour(e.cycleTimeSeconds, e.partsCount, settings.captureIntervalMinutes) ?? 0);

      const totalParts = entries.reduce((s, e) => s + (e.partsCount ?? 0), 0);
      const assignedMachineNames = emp.assignedMachines
        .map((mid) => machines.find((m) => m.id === mid)?.name)
        .filter(Boolean)
        .join(", ");

      return { id: emp.id, label: emp.name, value: rate ?? 0, sub: assignedMachineNames || "—", trend, totalParts, entries: entries.length };
    }).filter(Boolean) as { id: string; label: string; value: number; sub: string; trend: number[]; totalParts: number; entries: number }[];
  }, [filtered, employees, machines, settings.captureIntervalMinutes]);

  const chartData = tab === "machine" ? machineData : employeeData;

  // Summary KPIs
  const totalParts = filtered.reduce((s, e) => s + (e.partsCount ?? 0), 0);
  const avgRate = chartData.length > 0
    ? Math.round(chartData.reduce((s, d) => s + d.value, 0) / chartData.filter((d) => d.value > 0).length || 0)
    : 0;
  const topPerformer = [...chartData].sort((a, b) => b.value - a.value)[0];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Production Charts</h1>
        <p className="text-gray-500 mt-1">pcs/hour performance by machine and employee</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Total Parts</p>
          <p className="text-2xl font-bold text-gray-900">{totalParts.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">in selected range</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Avg pcs/hr</p>
          <p className="text-2xl font-bold text-primary-600">{avgRate > 0 ? avgRate : "—"}</p>
          <p className="text-xs text-gray-400 mt-0.5">across active {tab}s</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Top {tab === "machine" ? "Machine" : "Operator"}</p>
          <p className="text-lg font-bold text-green-700 truncate">{topPerformer?.label ?? "—"}</p>
          <p className="text-xs text-gray-400 mt-0.5">{topPerformer ? `${topPerformer.value} pcs/hr` : "no data"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Captures</p>
          <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">photos analyzed</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Tab */}
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setTab("machine")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "machine" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            By Machine
          </button>
          <button
            onClick={() => setTab("employee")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "employee" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            By Employee
          </button>
        </div>

        {/* Range selector */}
        <div className="relative ml-auto">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
          >
            <option value="8h">Last 8 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="all">All time</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Main bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary-600" />
          <h2 className="font-bold text-gray-900">
            {tab === "machine" ? "Machine Output" : "Employee Output"} — pcs / hour
          </h2>
        </div>
        <BarChart
          data={chartData.map((d) => ({ label: d.label, value: d.value, sub: d.sub }))}
          color={tab === "machine" ? "#6366f1" : "#10b981"}
          unit="pcs/hour (calculated from cycle time or capture rate)"
          height={200}
        />
      </div>

      {/* Detail cards */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chartData.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">{d.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{d.sub}</p>
                </div>
                <span className={`text-lg font-bold ${d.value >= avgRate && avgRate > 0 ? "text-green-600" : "text-gray-700"}`}>
                  {d.value > 0 ? `${d.value}` : "—"}
                  <span className="text-xs font-normal text-gray-400 ml-1">pcs/hr</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {d.entries} captures</span>
                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {d.totalParts} parts</span>
              </div>

              {d.trend.length >= 2 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">Trend</span>
                  <Sparkline
                    values={d.trend}
                    color={tab === "machine" ? "#6366f1" : "#10b981"}
                  />
                  {d.trend.length >= 2 && (() => {
                    const delta = d.trend[d.trend.length - 1] - d.trend[0];
                    return (
                      <span className={`text-xs font-semibold ml-auto ${delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {delta >= 0 ? "+" : ""}{delta} pcs/hr
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {chartData.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No production data in this time range</p>
          <p className="text-sm mt-1">Capture some CNC photos to see charts here</p>
        </div>
      )}
    </div>
  );
}
