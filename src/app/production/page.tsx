"use client";

import { useApp } from "@/lib/context";
import {
  Clock, Camera, AlertCircle, Users, CheckCircle, Monitor,
  FileText, Gauge, Zap, Wrench, Timer, AlertOctagon, Target,
  TrendingUp, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";

function timeDisplay(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return "—"; }
}

function timeSince(iso: string) {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff} min ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
  } catch { return "Unknown"; }
}

export default function ProductionPage() {
  const { productionEntries, machines, employees, settings } = useApp();
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const intervalMin = settings.captureIntervalMinutes || 60;
  const intervalMs = intervalMin * 60 * 1000;

  function toggleEntry(id: string) {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Most recent capture for each employee
  const recentByEmployee: Record<string, typeof productionEntries[0]> = {};
  // Captures grouped by machine
  const byMachine: Record<string, typeof productionEntries> = {};

  productionEntries.forEach((entry) => {
    if (!byMachine[entry.machineId]) byMachine[entry.machineId] = [];
    byMachine[entry.machineId].push(entry);

    const existing = recentByEmployee[entry.operatorName];
    if (!existing || new Date(entry.capturedAt).getTime() > new Date(existing.capturedAt).getTime()) {
      recentByEmployee[entry.operatorName] = entry;
    }
  });

  const totalParts = productionEntries.reduce((s, e) => s + (e.partsCount ?? 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Production Live View</h1>
        <p className="text-gray-500 mt-1">Real-time CNC data by Employee and Machine</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total Captures</span>
            <Camera className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{productionEntries.length}</p>
          <p className="text-sm text-gray-500 mt-1">photos analyzed</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total Parts</span>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-blue-700">{totalParts.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">pcs recorded</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Active Employees</span>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{Object.keys(recentByEmployee).length}</p>
          <p className="text-sm text-gray-500 mt-1">operators tracked</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Active Machines</span>
            <Monitor className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-primary-600">{Object.keys(byMachine).length}</p>
          <p className="text-sm text-gray-500 mt-1">with data</p>
        </div>
      </div>

      {/* Operator Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Operator Status</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Every {intervalMin} min
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {employees.map((emp) => {
            const lastEntry = recentByEmployee[emp.name];
            let onTime = false;
            let statusText = "No captures yet";

            if (lastEntry) {
              const msSince = Date.now() - new Date(lastEntry.capturedAt).getTime();
              onTime = msSince <= intervalMs;
              statusText = `Last captured ${timeSince(lastEntry.capturedAt)}`;
            }

            const pcsHr = lastEntry?.cycleTimeSeconds && lastEntry.cycleTimeSeconds > 0
              ? Math.round(3600 / lastEntry.cycleTimeSeconds)
              : null;

            return (
              <div key={emp.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center font-bold text-gray-600">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-500">{statusText}</p>
                    </div>
                  </div>
                  {lastEntry ? (
                    onTime ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" /> On Schedule
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" /> Missed Window
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </span>
                  )}
                </div>

                {lastEntry && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Latest: {lastEntry.machineName}</p>

                    {/* Key production numbers */}
                    <div className="flex flex-wrap gap-2">
                      {lastEntry.partsCount != null && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-xs text-blue-500">Parts</p>
                          <p className="font-bold text-blue-900 text-lg">{lastEntry.partsCount}</p>
                        </div>
                      )}
                      {pcsHr != null && (
                        <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-xs text-green-500">pcs/hr</p>
                          <p className="font-bold text-green-900 text-lg">{pcsHr}</p>
                        </div>
                      )}
                      {lastEntry.partGoal != null && (
                        <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-xs text-purple-500">Target</p>
                          <p className="font-bold text-purple-900 text-lg">{lastEntry.partGoal}</p>
                        </div>
                      )}
                      {lastEntry.cycleTimeSeconds != null && (
                        <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-xs text-orange-500">Cycle</p>
                          <p className="font-bold text-orange-900 text-lg">{lastEntry.cycleTimeSeconds}s</p>
                        </div>
                      )}
                    </div>

                    {/* Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {lastEntry.programNumber && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">
                          <FileText className="w-3 h-3" />{lastEntry.programNumber}
                        </span>
                      )}
                      {lastEntry.toolNumber && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs">
                          <Wrench className="w-3 h-3" />{lastEntry.toolNumber}
                        </span>
                      )}
                      {lastEntry.machineMode && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                          <Monitor className="w-3 h-3" />{lastEntry.machineMode}
                        </span>
                      )}
                      {lastEntry.spindleSpeed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full text-xs">
                          <Gauge className="w-3 h-3" />S {lastEntry.spindleSpeed}
                        </span>
                      )}
                      {lastEntry.feedRate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs">
                          <Zap className="w-3 h-3" />F {lastEntry.feedRate}
                        </span>
                      )}
                      {lastEntry.warnings && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs">
                          <AlertOctagon className="w-3 h-3" />{lastEntry.warnings}
                        </span>
                      )}
                    </div>

                    {/* Axis positions compact */}
                    {lastEntry.axisPositions && lastEntry.axisPositions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {lastEntry.axisPositions.map((pos, idx) => (
                          <div key={idx} className="bg-gray-50 text-gray-700 px-2 py-0.5 rounded text-xs font-mono border border-gray-100">
                            <span className="font-bold text-gray-400 mr-1">{pos.axis}</span>{pos.value}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {employees.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No employees configured.</p>
            </div>
          )}
        </div>
      </div>

      {/* Machine Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Capture Timeline by Machine</h2>

        {Object.entries(byMachine).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm">No captures yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byMachine).map(([machineId, entries]) => {
              const machineName = machines.find((m) => m.id === machineId)?.name || entries[0].machineName || "Unknown";
              const machineTotal = entries.reduce((s, e) => s + (e.partsCount ?? 0), 0);
              const ctSamples = entries.map((e) => e.cycleTimeSeconds).filter((v): v is number => v != null && v > 0);
              const medianCt = ctSamples.length > 0
                ? ctSamples.sort((a, b) => a - b)[Math.floor(ctSamples.length / 2)]
                : null;

              return (
                <div key={machineId} className="border-l-2 border-primary-200 pl-4 ml-2 relative">
                  <div className="absolute w-4 h-4 bg-primary-600 rounded-full -left-[9px] top-0 border-4 border-white" />
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-bold text-gray-900 text-lg">{machineName}</h3>
                    {machineTotal > 0 && (
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                        {machineTotal} parts total
                      </span>
                    )}
                    {medianCt && (
                      <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                        {Math.round(3600 / medianCt)} pcs/hr
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {entries.slice(0, 10).map((entry) => {
                      const isExpanded = expandedEntries.has(entry.id);
                      const pcsHr = entry.cycleTimeSeconds && entry.cycleTimeSeconds > 0
                        ? Math.round(3600 / entry.cycleTimeSeconds)
                        : null;

                      return (
                        <div key={entry.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                          {/* Collapsed row */}
                          <button
                            onClick={() => toggleEntry(entry.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-700">{entry.operatorName}</span>
                                {entry.partsCount != null && (
                                  <span className="font-bold text-blue-700 text-sm">{entry.partsCount} pcs</span>
                                )}
                                {pcsHr != null && (
                                  <span className="text-xs font-semibold text-green-600">{pcsHr}/hr</span>
                                )}
                                {entry.programNumber && (
                                  <span className="text-xs text-purple-600 font-mono">{entry.programNumber}</span>
                                )}
                                {entry.toolNumber && (
                                  <span className="text-xs text-amber-600">{entry.toolNumber}</span>
                                )}
                                {entry.machineMode && (
                                  <span className="text-xs text-indigo-600">{entry.machineMode}</span>
                                )}
                                {entry.cycleTimeSeconds != null && (
                                  <span className="text-xs text-orange-600">{entry.cycleTimeSeconds}s</span>
                                )}
                                {entry.spindleSpeed && (
                                  <span className="text-xs text-cyan-600">S{entry.spindleSpeed}</span>
                                )}
                                {entry.feedRate && (
                                  <span className="text-xs text-teal-600">F{entry.feedRate}</span>
                                )}
                                {entry.warnings && (
                                  <span className="text-xs text-red-600 font-medium">⚠ {entry.warnings}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">
                              {entry.capturedAt ? timeDisplay(entry.capturedAt) : entry.timestamp}
                            </span>
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                              : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                          </button>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="border-t border-gray-100 px-4 py-3 bg-white space-y-3">
                              {/* KPI boxes */}
                              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {entry.partsCount != null && (
                                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
                                    <p className="text-xs text-blue-500">Parts</p>
                                    <p className="font-bold text-blue-900">{entry.partsCount}</p>
                                  </div>
                                )}
                                {entry.partGoal != null && (
                                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-2 text-center">
                                    <p className="text-xs text-purple-500">Target</p>
                                    <p className="font-bold text-purple-900">{entry.partGoal}</p>
                                  </div>
                                )}
                                {pcsHr != null && (
                                  <div className="bg-green-50 border border-green-100 rounded-lg p-2 text-center">
                                    <p className="text-xs text-green-500">pcs/hr</p>
                                    <p className="font-bold text-green-900">{pcsHr}</p>
                                  </div>
                                )}
                                {entry.cycleTimeSeconds != null && (
                                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 text-center">
                                    <p className="text-xs text-orange-500">Cycle</p>
                                    <p className="font-bold text-orange-900">{entry.cycleTimeSeconds}s</p>
                                  </div>
                                )}
                                {entry.spindleSpeed && (
                                  <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-2 text-center">
                                    <p className="text-xs text-cyan-500">Spindle</p>
                                    <p className="font-bold text-cyan-900">{entry.spindleSpeed}</p>
                                  </div>
                                )}
                              </div>

                              {/* Chips */}
                              <div className="flex flex-wrap gap-1.5">
                                {entry.programNumber && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                                    <FileText className="w-3 h-3" />{entry.programNumber}
                                  </span>
                                )}
                                {entry.toolNumber && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                                    <Wrench className="w-3 h-3" />{entry.toolNumber}
                                  </span>
                                )}
                                {entry.machineMode && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                                    <Monitor className="w-3 h-3" />{entry.machineMode}
                                  </span>
                                )}
                                {entry.feedRate && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">
                                    <Zap className="w-3 h-3" />F {entry.feedRate}
                                  </span>
                                )}
                                {entry.programProgressPercent != null && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                    <Target className="w-3 h-3" />Progress {entry.programProgressPercent}%
                                  </span>
                                )}
                                {entry.runTime && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                    <Timer className="w-3 h-3" />Runtime {entry.runTime}
                                  </span>
                                )}
                                {entry.programRemainder && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                    <Clock className="w-3 h-3" />Remaining {entry.programRemainder}
                                  </span>
                                )}
                              </div>

                              {/* Work coordinates */}
                              {entry.axisPositions && entry.axisPositions.length > 0 && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Work Coordinates</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {entry.axisPositions.map((pos, i) => (
                                      <span key={i} className="font-mono text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-700">
                                        <span className="text-gray-400 font-bold mr-1">{pos.axis}</span>{pos.value}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Machine coordinates */}
                              {entry.machineCoordinates && entry.machineCoordinates.length > 0 && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Machine Coordinates</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {entry.machineCoordinates.map((pos, i) => (
                                      <span key={i} className="font-mono text-xs bg-yellow-50 border border-yellow-100 rounded px-2 py-1 text-yellow-800">
                                        <span className="text-yellow-500 font-bold mr-1">{pos.axis}</span>{pos.value}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Warning */}
                              {entry.warnings && (
                                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />{entry.warnings}
                                </div>
                              )}

                              {/* Photo thumbnail */}
                              {entry.captureImage && (
                                <details>
                                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">View photo</summary>
                                  <picture>
                                    <img src={entry.captureImage} alt="CNC capture" className="mt-2 w-full max-h-48 object-contain bg-gray-50 rounded-lg" />
                                  </picture>
                                </details>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {entries.length > 10 && (
                      <p className="text-xs text-gray-400 pt-2">+ {entries.length - 10} older captures</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
