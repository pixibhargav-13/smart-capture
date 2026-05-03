"use client";

import { useApp } from "@/lib/context";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle, XCircle, Clock, AlertTriangle, Camera,
  TrendingUp, Users, Gauge, Zap, FileText, Wrench, Timer, ChevronDown
} from "lucide-react";
import { buildMachineSlots, slotSummary, isWindowOpen, secondsInWindow, secondsUntilNextSlot, isDemoMode, DEMO_INTERVAL, DEMO_WINDOW } from "@/lib/slots";
import type { SlotInfo } from "@/lib/slots";
import type { ProductionEntry } from "@/lib/context";

function MachineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M12 6V2" /><path d="M6 6V4" /><path d="M18 6V4" />
      <circle cx="8" cy="12" r="2" /><circle cx="16" cy="12" r="2" />
      <path d="M10 12h4" />
    </svg>
  );
}

// ── Slot chip ──────────────────────────────────────────────────────────────

function SlotChip({ slot }: { slot: SlotInfo }) {
  const base = "flex flex-col items-center rounded-lg border px-1.5 py-1 min-w-[44px] text-center transition-all";

  if (slot.status === "captured") {
    const pcsHr = slot.cycleTimeSeconds && slot.cycleTimeSeconds > 0
      ? Math.round(3600 / slot.cycleTimeSeconds) : null;
    return (
      <div className={`${base} bg-green-50 border-green-300`} title={`Captured at ${slot.capturedAt ? new Date(slot.capturedAt).toLocaleTimeString() : "?"} — ${slot.partsCount ?? "?"} parts`}>
        <span className="text-[9px] font-bold text-green-600">{slot.shortLabel}</span>
        <CheckCircle className="w-3.5 h-3.5 text-green-500 my-0.5" />
        {slot.partsCount != null && <span className="text-[9px] font-bold text-green-700">{slot.partsCount}</span>}
        {pcsHr != null && <span className="text-[8px] text-green-500">{pcsHr}/h</span>}
      </div>
    );
  }

  if (slot.status === "missed") {
    return (
      <div className={`${base} bg-red-50 border-red-300`} title={`Missed — window was ${slot.label} to ${slot.windowEnd.toLocaleTimeString()}`}>
        <span className="text-[9px] font-bold text-red-500">{slot.shortLabel}</span>
        <XCircle className="w-3.5 h-3.5 text-red-400 my-0.5" />
        <span className="text-[9px] text-red-400">miss</span>
      </div>
    );
  }

  if (slot.status === "open") {
    return (
      <div className={`${base} bg-amber-50 border-amber-400 ring-2 ring-amber-300 ring-offset-1`} title="Window OPEN — capture now!">
        <span className="text-[9px] font-bold text-amber-600">{slot.shortLabel}</span>
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 my-0.5 animate-pulse" />
        <span className="text-[9px] font-bold text-amber-600">OPEN</span>
      </div>
    );
  }

  // upcoming
  return (
    <div className={`${base} bg-gray-50 border-gray-200 opacity-50`} title={`Upcoming — opens at ${slot.label}`}>
      <span className="text-[9px] font-bold text-gray-400">{slot.shortLabel}</span>
      <Clock className="w-3.5 h-3.5 text-gray-300 my-0.5" />
      <span className="text-[9px] text-gray-300">—</span>
    </div>
  );
}

// ── Trend Chart ───────────────────────────────────────────────────────────

interface TrendPoint { label: string; value: number; sub: string }

function TrendChart({ points, color }: { points: TrendPoint[]; color: string }) {
  if (points.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No data yet for this selection</p>;
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  const barW = Math.min(44, Math.floor(520 / points.length) - 6);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${Math.max(520, points.length * (barW + 8))} 220`}
        className="w-full"
        style={{ minWidth: points.length * (barW + 8) }}
      >
        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = 160 * (1 - f) + 10;
          return (
            <g key={f}>
              <line x1={36} x2="100%" y1={y} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <text x={32} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{Math.round(max * f)}</text>
            </g>
          );
        })}
        {/* bars + labels */}
        {points.map((p, i) => {
          const barH = Math.max(3, (p.value / max) * 150);
          const x = 42 + i * (barW + 8);
          const y = 170 - barH;
          const mid = x + barW / 2;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} opacity={0.82} />
              <text x={mid} y={y - 3} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#374151">{p.value}</text>
              <text x={mid} y={185} textAnchor="middle" fontSize={9} fill="#6b7280" fontWeight="600">
                {p.label.length > 7 ? p.label.slice(0, 7) + "…" : p.label}
              </text>
              <text x={mid} y={197} textAnchor="middle" fontSize={8} fill="#9ca3af">{p.sub}</text>
            </g>
          );
        })}
        <text x={36} y={215} fontSize={9} fill="#9ca3af" fontStyle="italic">pcs/hour</text>
      </svg>
    </div>
  );
}

function buildTrendPoints(
  entries: ProductionEntry[],
  type: "machine" | "employee",
  id: string,
  intervalMin: number,
): TrendPoint[] {
  const filtered = type === "machine"
    ? entries.filter((e) => e.machineId === id)
    : entries.filter((e) => e.operatorName === id);

  return [...filtered]
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
    .slice(-15)
    .map((e) => {
      const pcsHr = e.cycleTimeSeconds && e.cycleTimeSeconds > 0
        ? Math.round(3600 / e.cycleTimeSeconds)
        : e.partsCount && e.partsCount > 0
          ? Math.round(e.partsCount / (intervalMin / 60))
          : 0;
      const d = new Date(e.capturedAt);
      const label = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const sub = d.toLocaleDateString([], { month: "short", day: "numeric" });
      return { label, value: pcsHr, sub };
    });
}

// ── Countdown hook ─────────────────────────────────────────────────────────

function useWindowState(intervalMin: number, windowMin: number) {
  const [state, setState] = useState({ open: false, secs: 0 });
  useEffect(() => {
    const tick = () => {
      const open = isWindowOpen(intervalMin, windowMin);
      const secs = open ? secondsInWindow(intervalMin, windowMin) : secondsUntilNextSlot(intervalMin);
      setState({ open, secs });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [intervalMin, windowMin]);
  return state;
}

function fmt(secs: number) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { machines, employees, productionEntries, locations, settings } = useApp();
  const [tick, setTick] = useState(0);
  const [trendType, setTrendType] = useState<"machine" | "employee">("machine");
  const [trendId, setTrendId] = useState<string>("");

  const _demoOn = isDemoMode();
  const intervalMin = _demoOn ? DEMO_INTERVAL : (settings.captureIntervalMinutes || 60);
  const windowMin = _demoOn ? DEMO_WINDOW : (settings.captureWindowMinutes || 15);
  const windowState = useWindowState(intervalMin, windowMin);

  // Re-render slots every 15s so status updates without full reload
  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  // Summary stats
  const activeMachines = machines.filter((m) => m.status === "active");
  const totalParts = productionEntries.reduce((s, e) => s + (e.partsCount ?? 0), 0);
  const ctSamples = productionEntries.map((e) => e.cycleTimeSeconds).filter((v): v is number => v != null && v > 0);
  const avgCt = ctSamples.length > 0 ? Math.round(ctSamples.reduce((a, b) => a + b, 0) / ctSamples.length) : null;
  const avgPcsHr = avgCt ? Math.round(3600 / avgCt) : null;

  // Per-machine slot data — recomputed on tick
  const machineSlots = machines.map((m) => {
    const slots = buildMachineSlots(m.id, productionEntries, intervalMin, windowMin, 3);
    const summary = slotSummary(slots);
    const operator = employees.find((e) => e.id === m.operatorId);
    const lastEntry = [...productionEntries]
      .filter((e) => e.machineId === m.id)
      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())[0];
    return { machine: m, operator, slots, summary, lastEntry };
  });

  // Overall today's slot stats
  const allSlots = machineSlots.flatMap((ms) => ms.slots);
  const totalCaptured = allSlots.filter((s) => s.status === "captured").length;
  const totalMissed = allSlots.filter((s) => s.status === "missed").length;
  const totalOpen = allSlots.filter((s) => s.status === "open").length;

  // void tick to suppress unused warning
  void tick;

  // Default trendId to first machine/employee when list loads
  const trendOptions = trendType === "machine"
    ? machines.map((m) => ({ id: m.id, label: `${m.name} (${m.type})` }))
    : employees.map((e) => ({ id: e.name, label: e.name }));
  const activeTrendId = trendId || trendOptions[0]?.id || "";
  const trendPoints = buildTrendPoints(productionEntries, trendType, activeTrendId, intervalMin);

  return (
    <div>
      <div className="mb-4 hidden sm:flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Today&apos;s slot status — Every {intervalMin}m · {windowMin}m window each
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
      </div>
      {/* Date line on mobile only */}
      <p className="text-xs text-gray-400 mb-3 sm:hidden">
        {new Date().toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })} · Every {intervalMin}m · {windowMin}m window
      </p>

      {/* Global window status banner */}
      {windowState.open ? (
        <div className="mb-5 bg-red-50 border-2 border-red-400 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3 sm:mb-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-red-700 text-base sm:text-lg">Capture Window is OPEN!</p>
              <p className="text-xs sm:text-sm text-red-500">
                {windowMin}-min window — closes in <span className="font-mono font-bold">{fmt(windowState.secs)}</span>.
                Uncaptured machines → <strong>Missed</strong>.
              </p>
            </div>
          </div>
          <Link
            href="/capture"
            className="mt-3 sm:mt-0 sm:ml-4 block sm:inline-block text-center px-5 py-2.5 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-colors sm:shrink-0"
          >
            Capture Now
          </Link>
        </div>
      ) : (
        <div className="mb-5 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-700 text-sm">Next slot opens in <span className="font-mono text-primary-600">{fmt(windowState.secs)}</span></p>
            <p className="text-xs text-gray-400">Window stays open {windowMin} min — capture all machines.</p>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Slots Captured</p>
          <p className="text-2xl font-bold text-green-700">{totalCaptured}</p>
          <p className="text-xs text-gray-400">today across all machines</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Slots Missed</p>
          <p className={`text-2xl font-bold ${totalMissed > 0 ? "text-red-600" : "text-gray-400"}`}>{totalMissed}</p>
          <p className="text-xs text-gray-400">no capture in window</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Total Parts</p>
          <p className="text-2xl font-bold text-blue-700">{totalParts.toLocaleString()}</p>
          <p className="text-xs text-gray-400">{productionEntries.length} captures</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Avg pcs/hr</p>
          <p className="text-2xl font-bold text-primary-600">{avgPcsHr ?? "—"}</p>
          <p className="text-xs text-gray-400">{activeMachines.length} active machines · {locations.length} locations</p>
        </div>
      </div>

      {/* Per-machine slot grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 mb-6">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="font-bold text-gray-900 text-base sm:text-lg">Today&apos;s Slots</h2>
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" /> Captured</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-300 inline-block" /> Missed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300 inline-block" /> Open</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Upcoming</span>
          </div>
          {/* Mobile legend — compact */}
          <div className="flex sm:hidden items-center gap-1.5 text-[10px] text-gray-400 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded bg-green-400 inline-block" />
            <span className="w-2.5 h-2.5 rounded bg-red-300 inline-block" />
            <span className="w-2.5 h-2.5 rounded bg-amber-300 inline-block" />
            <span className="w-2.5 h-2.5 rounded bg-gray-200 inline-block" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-4">Each box = one {intervalMin}-min slot. Window = first {windowMin} min.</p>

        {machines.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No machines configured yet.</p>
        ) : (
          <div className="space-y-4">
            {machineSlots.map(({ machine, operator, slots, summary, lastEntry }) => {
              const pcsHr = lastEntry?.cycleTimeSeconds && lastEntry.cycleTimeSeconds > 0
                ? Math.round(3600 / lastEntry.cycleTimeSeconds) : null;

              return (
                <div key={machine.id} className="border border-gray-100 rounded-xl p-4">
                  {/* Machine header */}
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        machine.status === "active" ? "bg-green-50" : machine.status === "maintenance" ? "bg-orange-50" : "bg-gray-100"
                      }`}>
                        <MachineIcon className={`w-4 h-4 ${
                          machine.status === "active" ? "text-green-600" : machine.status === "maintenance" ? "text-orange-500" : "text-gray-400"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-gray-900 text-sm">{machine.name}</p>
                          <span className="text-xs text-gray-400">{machine.type}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{operator?.name ?? "Unassigned"}</p>
                      </div>
                    </div>

                    {/* Summary badges — compact on mobile */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs font-bold">
                        ✓{summary.captured}
                      </span>
                      {summary.missed > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-xs font-bold">
                          ✗{summary.missed}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                        summary.pct >= 90 ? "bg-green-100 text-green-700" :
                        summary.pct >= 70 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-600"
                      }`}>
                        {summary.pct}%
                      </span>
                      {pcsHr != null && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold">
                          {pcsHr}/h
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Slot chips — scrollable row */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {slots.map((slot) => (
                      <SlotChip key={slot.index} slot={slot} />
                    ))}
                  </div>

                  {/* Latest capture detail — compact */}
                  {lastEntry && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {lastEntry.partsCount != null && (
                        <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 font-semibold">
                          {lastEntry.partsCount} pcs
                        </span>
                      )}
                      {lastEntry.programNumber && (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 rounded-full px-2 py-0.5">
                          <FileText className="w-3 h-3" />{lastEntry.programNumber}
                        </span>
                      )}
                      {lastEntry.toolNumber && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">
                          <Wrench className="w-3 h-3" />{lastEntry.toolNumber}
                        </span>
                      )}
                      {lastEntry.cycleTimeSeconds != null && (
                        <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 rounded-full px-2 py-0.5">
                          <Timer className="w-3 h-3" />{lastEntry.cycleTimeSeconds}s
                        </span>
                      )}
                      {lastEntry.spindleSpeed && (
                        <span className="inline-flex items-center gap-1 text-xs bg-cyan-50 text-cyan-700 rounded-full px-2 py-0.5">
                          <Gauge className="w-3 h-3" />S {lastEntry.spindleSpeed}
                        </span>
                      )}
                      {lastEntry.feedRate && (
                        <span className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 rounded-full px-2 py-0.5">
                          <Zap className="w-3 h-3" />F {lastEntry.feedRate}
                        </span>
                      )}
                      {lastEntry.warnings && (
                        <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 rounded-full px-2 py-0.5">
                          <AlertTriangle className="w-3 h-3" />{lastEntry.warnings}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Axis positions — if present */}
                  {lastEntry?.axisPositions && lastEntry.axisPositions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {lastEntry.axisPositions.map((pos, i) => (
                        <span key={i} className="font-mono text-[10px] bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-gray-600">
                          <span className="text-gray-400 font-bold">{pos.axis}</span> {pos.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 mb-4">
          <h2 className="font-bold text-gray-900 text-base sm:text-lg sm:flex-1">Production Trend</h2>

          <div className="flex items-center gap-2">
            {/* Type toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => { setTrendType("machine"); setTrendId(""); }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${trendType === "machine" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
              >
                Machine
              </button>
              <button
                onClick={() => { setTrendType("employee"); setTrendId(""); }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${trendType === "employee" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
              >
                Employee
              </button>
            </div>

            {/* Entity selector */}
            <div className="relative flex-1 min-w-0">
              <select
                value={activeTrendId}
                onChange={(e) => setTrendId(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 text-xs sm:text-sm font-medium text-gray-700 focus:outline-none cursor-pointer truncate"
              >
                {trendOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-3">
          Last {Math.min(trendPoints.length, 15)} captures — pcs/hour calculated from cycle time
        </p>

        <TrendChart
          points={trendPoints}
          color={trendType === "machine" ? "#6366f1" : "#10b981"}
        />

        {/* Summary row below chart */}
        {trendPoints.length >= 2 && (() => {
          const first = trendPoints[0].value;
          const last = trendPoints[trendPoints.length - 1].value;
          const avg = Math.round(trendPoints.reduce((s, p) => s + p.value, 0) / trendPoints.length);
          const delta = last - first;
          return (
            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span>Avg: <strong className="text-gray-800">{avg} pcs/hr</strong></span>
              <span>Latest: <strong className="text-gray-800">{last} pcs/hr</strong></span>
              <span className={`font-semibold ${delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} pcs/hr vs first capture
              </span>
            </div>
          );
        })()}
      </div>

      {/* Quick actions — hidden on mobile (bottom nav covers these) */}
      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/capture" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-200 hover:shadow-sm transition-all flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Capture</p>
            <p className="text-xs text-gray-500">Photo → AI reads display</p>
          </div>
          {totalOpen > 0 && (
            <span className="ml-auto w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center">{totalOpen}</span>
          )}
        </Link>
        <Link href="/production" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-200 hover:shadow-sm transition-all flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Production</p>
            <p className="text-xs text-gray-500">Live view + timeline</p>
          </div>
        </Link>
        <Link href="/charts" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-200 hover:shadow-sm transition-all flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Charts</p>
            <p className="text-xs text-gray-500">pcs/hr by machine & operator</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
