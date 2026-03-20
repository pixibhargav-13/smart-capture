"use client";

import { useApp } from "@/lib/context";
import { Clock, Camera, AlertCircle, Users, CheckCircle, Monitor } from "lucide-react";

function timeDisplay(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return "—"; }
}

function timeSince(iso: string) {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff} min ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
  } catch {
    return "Unknown";
  }
}

export default function ProductionPage() {
  const { productionEntries, machines, employees, settings } = useApp();

  const intervalMin = settings.captureIntervalMinutes || 60;
  const intervalMs = intervalMin * 60 * 1000;

  // Most recent capture for each employee
  const recentByEmployee: Record<string, typeof productionEntries[0]> = {};
  // Captures grouped by machine
  const byMachine: Record<string, typeof productionEntries> = {};

  productionEntries.forEach((entry) => {
    // Group by machine
    if (!byMachine[entry.machineId]) byMachine[entry.machineId] = [];
    byMachine[entry.machineId].push(entry);

    // Track most recent by employee
    const existing = recentByEmployee[entry.operatorName];
    if (!existing || new Date(entry.capturedAt).getTime() > new Date(existing.capturedAt).getTime()) {
      recentByEmployee[entry.operatorName] = entry;
    }
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Production Live View</h1>
        <p className="text-gray-500 mt-1">Real-time axis capture monitoring by Employee and Machine</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total Captures</span>
            <Camera className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{productionEntries.length}</p>
          <p className="text-sm text-gray-500 mt-1">photos captured & analyzed</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Active Employees</span>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{Object.keys(recentByEmployee).length}</p>
          <p className="text-sm text-gray-500 mt-1">operators tracking machines</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Active Machines</span>
            <Monitor className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-primary-600">{Object.keys(byMachine).length}</p>
          <p className="text-sm text-gray-500 mt-1">with recorded data</p>
        </div>
      </div>

      {/* Operator Status - Check if they pressed capture or not */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Operator Capture Status</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Target Frequency: Every {intervalMin} min
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

                {/* Display dynamic axis from their latest capture */}
                {lastEntry && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-2 uppercase font-semibold">Latest Axis Capture ({lastEntry.machineName})</p>
                    {lastEntry.axisPositions && lastEntry.axisPositions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {lastEntry.axisPositions.map((pos, idx) => (
                          <div key={idx} className="bg-blue-50 text-blue-900 px-2 py-1 rounded text-sm font-mono border border-blue-100">
                            <span className="font-bold mr-2 text-blue-700">{pos.axis}</span>
                            {pos.value}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 font-mono italic">No axis data detected</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {employees.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No employees configured in the system.</p>
            </div>
          )}
        </div>
      </div>

      {/* Machine Captured Data Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Axis Capture Timeline by Machine</h2>
        
        {Object.entries(byMachine).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm">No captures yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byMachine).map(([machineId, entries]) => {
              const machineName = machines.find((m) => m.id === machineId)?.name || entries[0].machineName || "Unknown Machine";
              
              return (
                <div key={machineId} className="border-l-2 border-primary-200 pl-4 ml-2 relative">
                  <div className="absolute w-4 h-4 bg-primary-600 rounded-full -left-[9px] top-0 border-4 border-white"></div>
                  <h3 className="font-bold text-gray-900 text-lg mb-3 leading-none">{machineName}</h3>
                  
                  <div className="space-y-3">
                    {/* Only showing last 10 captures max per machine to keep UI clean */}
                    {entries.slice(0, 10).map((entry) => (
                      <div key={entry.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-gray-700">{entry.operatorName}</span>
                          <span className="text-xs text-gray-500 font-medium">
                            {entry.capturedAt ? timeDisplay(entry.capturedAt) : entry.timestamp}
                          </span>
                        </div>
                        
                        {/* Dynamic Axis Positions Grid */}
                        <div className="bg-white rounded border border-gray-200 p-2">
                          {entry.axisPositions && entry.axisPositions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {entry.axisPositions.map((pos, idx) => (
                                <div key={idx} className="flex items-center bg-gray-50 px-2 py-0.5 rounded text-sm font-mono border border-gray-100">
                                  <span className="font-bold text-gray-500 mr-2">{pos.axis}:</span>
                                  <span className="text-gray-900">{pos.value}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic font-mono">No axis data</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {entries.length > 10 && (
                      <p className="text-xs text-gray-400 pt-2 font-medium">
                        + {entries.length - 10} older captures
                      </p>
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
