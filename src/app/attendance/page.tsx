"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Clock, TrendingUp, AlertCircle, ChevronDown } from "lucide-react";

// ── Static demo data ────────────────────────────────────────────────────────
// In a real system this would come from an HR/attendance API

interface AttendanceRecord {
  date: string;      // YYYY-MM-DD
  present: boolean;
  late: boolean;     // arrived > 15 min after shift start
  leftEarly: boolean;
  shift: "Morning" | "Afternoon" | "Night";
  checkIn?: string;  // HH:MM
  checkOut?: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  machine: string;
  avatar: string;
  records: AttendanceRecord[];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const DEMO_EMPLOYEES: Employee[] = [
  {
    id: "e1", name: "Nitinbhai Patel", role: "CNC Operator", machine: "LMW-35 (Siemens)", avatar: "N",
    records: [
      { date: daysAgo(0), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "08:02", checkOut: "17:05" },
      { date: daysAgo(1), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:58", checkOut: "17:00" },
      { date: daysAgo(2), present: true,  late: true,  leftEarly: false, shift: "Morning",   checkIn: "08:32", checkOut: "17:00" },
      { date: daysAgo(3), present: false, late: false, leftEarly: false, shift: "Morning" },
      { date: daysAgo(4), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "08:00", checkOut: "17:01" },
      { date: daysAgo(5), present: true,  late: false, leftEarly: true,  shift: "Morning",   checkIn: "07:55", checkOut: "15:30" },
      { date: daysAgo(6), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:59", checkOut: "17:03" },
      { date: daysAgo(7), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "08:01", checkOut: "17:00" },
      { date: daysAgo(8), present: true,  late: true,  leftEarly: false, shift: "Morning",   checkIn: "08:45", checkOut: "17:00" },
      { date: daysAgo(9), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:58", checkOut: "17:02" },
    ],
  },
  {
    id: "e2", name: "Rajesh Kumar", role: "CNC Operator", machine: "BMW-3 (990TDc)", avatar: "R",
    records: [
      { date: daysAgo(0), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:55", checkOut: "17:00" },
      { date: daysAgo(1), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:57", checkOut: "17:05" },
      { date: daysAgo(2), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "08:00", checkOut: "17:00" },
      { date: daysAgo(3), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:58", checkOut: "17:02" },
      { date: daysAgo(4), present: false, late: false, leftEarly: false, shift: "Morning" },
      { date: daysAgo(5), present: false, late: false, leftEarly: false, shift: "Morning" },
      { date: daysAgo(6), present: true,  late: true,  leftEarly: false, shift: "Morning",   checkIn: "09:10", checkOut: "17:00" },
      { date: daysAgo(7), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:59", checkOut: "17:01" },
      { date: daysAgo(8), present: true,  late: false, leftEarly: true,  shift: "Morning",   checkIn: "08:00", checkOut: "14:45" },
      { date: daysAgo(9), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:56", checkOut: "17:00" },
    ],
  },
  {
    id: "e3", name: "Suresh Vaghela", role: "CNC Operator", machine: "BMW-4 (990TDc)", avatar: "S",
    records: [
      { date: daysAgo(0), present: true,  late: false, leftEarly: false, shift: "Afternoon", checkIn: "14:00", checkOut: "22:05" },
      { date: daysAgo(1), present: true,  late: true,  leftEarly: false, shift: "Afternoon", checkIn: "14:28", checkOut: "22:00" },
      { date: daysAgo(2), present: true,  late: false, leftEarly: false, shift: "Afternoon", checkIn: "13:58", checkOut: "22:02" },
      { date: daysAgo(3), present: true,  late: false, leftEarly: false, shift: "Afternoon", checkIn: "14:01", checkOut: "22:00" },
      { date: daysAgo(4), present: true,  late: false, leftEarly: false, shift: "Afternoon", checkIn: "13:59", checkOut: "22:03" },
      { date: daysAgo(5), present: true,  late: false, leftEarly: false, shift: "Afternoon", checkIn: "14:00", checkOut: "22:00" },
      { date: daysAgo(6), present: false, late: false, leftEarly: false, shift: "Afternoon" },
      { date: daysAgo(7), present: true,  late: false, leftEarly: true,  shift: "Afternoon", checkIn: "14:02", checkOut: "19:30" },
      { date: daysAgo(8), present: true,  late: false, leftEarly: false, shift: "Afternoon", checkIn: "13:57", checkOut: "22:00" },
      { date: daysAgo(9), present: true,  late: false, leftEarly: false, shift: "Afternoon", checkIn: "14:00", checkOut: "22:01" },
    ],
  },
  {
    id: "e4", name: "Pradeep Shah", role: "Senior Operator", machine: "HaOre HR808", avatar: "P",
    records: [
      { date: daysAgo(0), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:45", checkOut: "17:00" },
      { date: daysAgo(1), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:48", checkOut: "17:05" },
      { date: daysAgo(2), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:50", checkOut: "17:00" },
      { date: daysAgo(3), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:47", checkOut: "17:02" },
      { date: daysAgo(4), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:49", checkOut: "17:01" },
      { date: daysAgo(5), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:46", checkOut: "17:00" },
      { date: daysAgo(6), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:51", checkOut: "17:03" },
      { date: daysAgo(7), present: true,  late: false, leftEarly: false, shift: "Morning",   checkIn: "07:48", checkOut: "17:00" },
      { date: daysAgo(8), present: false, late: false, leftEarly: false, shift: "Morning" },
      { date: daysAgo(9), present: true,  late: true,  leftEarly: false, shift: "Morning",   checkIn: "08:20", checkOut: "17:00" },
    ],
  },
  {
    id: "e5", name: "Mahesh Rathod", role: "CNC Operator", machine: "CNC-05", avatar: "M",
    records: [
      { date: daysAgo(0), present: false, late: false, leftEarly: false, shift: "Night" },
      { date: daysAgo(1), present: true,  late: false, leftEarly: false, shift: "Night",     checkIn: "22:02", checkOut: "06:00" },
      { date: daysAgo(2), present: true,  late: true,  leftEarly: false, shift: "Night",     checkIn: "22:35", checkOut: "06:05" },
      { date: daysAgo(3), present: true,  late: false, leftEarly: false, shift: "Night",     checkIn: "21:58", checkOut: "06:01" },
      { date: daysAgo(4), present: true,  late: false, leftEarly: false, shift: "Night",     checkIn: "22:00", checkOut: "06:00" },
      { date: daysAgo(5), present: true,  late: false, leftEarly: true,  shift: "Night",     checkIn: "22:01", checkOut: "02:30" },
      { date: daysAgo(6), present: true,  late: false, leftEarly: false, shift: "Night",     checkIn: "22:00", checkOut: "06:00" },
      { date: daysAgo(7), present: true,  late: false, leftEarly: false, shift: "Night",     checkIn: "21:59", checkOut: "06:02" },
      { date: daysAgo(8), present: true,  late: false, leftEarly: false, shift: "Night",     checkIn: "22:00", checkOut: "06:00" },
      { date: daysAgo(9), present: false, late: false, leftEarly: false, shift: "Night" },
    ],
  },
];

// ── helpers ────────────────────────────────────────────────────────────────

function stats(records: AttendanceRecord[]) {
  const present = records.filter((r) => r.present).length;
  const absent = records.filter((r) => !r.present).length;
  const late = records.filter((r) => r.late).length;
  const leftEarly = records.filter((r) => r.leftEarly).length;
  const pct = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
  return { present, absent, late, leftEarly, pct, total: records.length };
}

function statusBadge(record: AttendanceRecord) {
  if (!record.present) return <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold">Absent</span>;
  if (record.late && record.leftEarly) return <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full text-xs font-semibold">Late + Early out</span>;
  if (record.late) return <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full text-xs font-semibold">Late</span>;
  if (record.leftEarly) return <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full text-xs font-semibold">Left early</span>;
  return <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold">Present</span>;
}

// Simple horizontal bar
function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5">
      <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

// Attendance heatmap row — last 10 days
function HeatmapRow({ records }: { records: AttendanceRecord[] }) {
  return (
    <div className="flex gap-1">
      {records.map((r, i) => {
        let bg = "bg-red-300";
        if (r.present && !r.late && !r.leftEarly) bg = "bg-green-400";
        else if (r.present && (r.late || r.leftEarly)) bg = "bg-yellow-300";
        return (
          <div
            key={i}
            title={`${r.date}: ${!r.present ? "Absent" : r.late ? "Late" : r.leftEarly ? "Left early" : "Present"}`}
            className={`w-5 h-5 rounded-sm ${bg}`}
          />
        );
      })}
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [shiftFilter, setShiftFilter] = useState<string>("All");

  const shifts = ["All", "Morning", "Afternoon", "Night"];
  const filtered = shiftFilter === "All" ? DEMO_EMPLOYEES : DEMO_EMPLOYEES.filter((e) => e.records[0]?.shift === shiftFilter);

  // Overall KPIs
  const allRecords = DEMO_EMPLOYEES.flatMap((e) => e.records);
  const today = daysAgo(0);
  const todayRecords = DEMO_EMPLOYEES.map((e) => ({ emp: e, rec: e.records.find((r) => r.date === today) }));
  const presentToday = todayRecords.filter((x) => x.rec?.present).length;
  const lateToday = todayRecords.filter((x) => x.rec?.late).length;
  const absentToday = todayRecords.filter((x) => !x.rec?.present).length;
  const overall = stats(allRecords);

  // Weekly attendance bar chart data
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = daysAgo(6 - i);
    const dayRecs = DEMO_EMPLOYEES.map((e) => e.records.find((r) => r.date === date)).filter(Boolean);
    const presentCount = dayRecs.filter((r) => r?.present).length;
    const label = new Date(date).toLocaleDateString("en", { weekday: "short" });
    return { label, value: presentCount, date };
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1">Employee attendance tracking — last 10 days</p>
        </div>
        <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-medium border border-blue-100">
          Demo data
        </span>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 font-medium">Present Today</span>
          </div>
          <p className="text-3xl font-bold text-green-700">{presentToday}</p>
          <p className="text-xs text-gray-400 mt-0.5">of {DEMO_EMPLOYEES.length} employees</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500 font-medium">Absent Today</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{absentToday}</p>
          <p className="text-xs text-gray-400 mt-0.5">needs coverage</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-gray-500 font-medium">Late Today</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{lateToday}</p>
          <p className="text-xs text-gray-400 mt-0.5">arrived late</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            <span className="text-xs text-gray-500 font-medium">10-Day Rate</span>
          </div>
          <p className="text-3xl font-bold text-primary-600">{overall.pct}%</p>
          <p className="text-xs text-gray-400 mt-0.5">attendance rate</p>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h2 className="font-bold text-gray-900 mb-4">Weekly Attendance — Employees Present per Day</h2>
        <div className="flex items-end gap-3 h-32 px-2">
          {weeklyData.map((d) => {
            const pct = DEMO_EMPLOYEES.length > 0 ? d.value / DEMO_EMPLOYEES.length : 0;
            const barH = Math.max(4, Math.round(pct * 100));
            const color = pct >= 0.8 ? "#22c55e" : pct >= 0.6 ? "#eab308" : "#ef4444";
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-gray-600">{d.value}</span>
                <div className="w-full rounded-t-md" style={{ height: `${barH}%`, background: color, minHeight: 4 }} />
                <span className="text-xs text-gray-400">{d.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> ≥80% present</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> 60–79%</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> &lt;60%</span>
        </div>
      </div>

      {/* Shift filter + table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-bold text-gray-900">Employee Breakdown</h2>
          <div className="relative">
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
            >
              {shifts.map((s) => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((emp) => {
            const s = stats(emp.records);
            const isOpen = selected === emp.id;
            return (
              <div key={emp.id} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Header row */}
                <button
                  onClick={() => setSelected(isOpen ? null : emp.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {emp.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.role} · {emp.machine}</p>
                  </div>

                  {/* Mini heatmap */}
                  <div className="hidden sm:block">
                    <HeatmapRow records={emp.records} />
                  </div>

                  {/* Stats */}
                  <div className="flex gap-3 text-xs shrink-0">
                    <span className="text-green-600 font-bold">{s.present}P</span>
                    <span className="text-red-500 font-bold">{s.absent}A</span>
                    {s.late > 0 && <span className="text-yellow-600 font-bold">{s.late}L</span>}
                  </div>

                  {/* Attendance rate */}
                  <div className="w-20 shrink-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Rate</span>
                      <span className={`font-bold ${s.pct >= 90 ? "text-green-600" : s.pct >= 75 ? "text-yellow-600" : "text-red-500"}`}>
                        {s.pct}%
                      </span>
                    </div>
                    <HBar value={s.present} max={s.total} color={s.pct >= 90 ? "#22c55e" : s.pct >= 75 ? "#eab308" : "#ef4444"} />
                  </div>

                  <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
                        <p className="text-xs text-gray-500">Present</p>
                        <p className="text-xl font-bold text-green-700">{s.present}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
                        <p className="text-xs text-gray-500">Absent</p>
                        <p className="text-xl font-bold text-red-600">{s.absent}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
                        <p className="text-xs text-gray-500">Late</p>
                        <p className="text-xl font-bold text-yellow-600">{s.late}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
                        <p className="text-xs text-gray-500">Left Early</p>
                        <p className="text-xl font-bold text-orange-500">{s.leftEarly}</p>
                      </div>
                    </div>

                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b border-gray-200">
                          <th className="text-left py-2 font-medium">Date</th>
                          <th className="text-left py-2 font-medium">Shift</th>
                          <th className="text-left py-2 font-medium">Check In</th>
                          <th className="text-left py-2 font-medium">Check Out</th>
                          <th className="text-left py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emp.records.map((rec, i) => (
                          <tr key={i} className={`border-b border-gray-100 ${!rec.present ? "bg-red-50/40" : rec.late ? "bg-yellow-50/40" : ""}`}>
                            <td className="py-2 text-gray-700 font-medium">{rec.date}</td>
                            <td className="py-2 text-gray-500">{rec.shift}</td>
                            <td className="py-2 font-mono text-gray-700">{rec.checkIn ?? "—"}</td>
                            <td className="py-2 font-mono text-gray-700">{rec.checkOut ?? "—"}</td>
                            <td className="py-2">{statusBadge(rec)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-gray-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No employees found for this shift</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-green-400 inline-block" /> Present on time</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-yellow-300 inline-block" /> Late or left early</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-red-300 inline-block" /> Absent</span>
        <span className="ml-auto italic">* Static demo data — connect HR API for live records</span>
      </div>
    </div>
  );
}
