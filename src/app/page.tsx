"use client";

import { useApp } from "@/lib/context";
import Link from "next/link";
import { Clock, Users, BarChart3, TrendingUp } from "lucide-react";

function MachineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M12 6V2" />
      <path d="M6 6V4" />
      <path d="M18 6V4" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="12" r="2" />
      <path d="M10 12h4" />
    </svg>
  );
}

export default function Dashboard() {
  const { machines, employees, productionEntries, locations } = useApp();

  const activeMachines = machines.filter((m) => m.status === "active").length;
  const totalUnits = productionEntries.reduce((sum, e) => sum + (e.partsCount ?? 0), 0);
  const avgCycleTime = productionEntries.length > 0 ? (totalUnits / productionEntries.length * 0.28).toFixed(1) : "0";

  const statCards = [
    {
      label: "Total Machines",
      value: machines.length,
      sub: `${activeMachines} currently active`,
      subColor: "text-green-600",
      icon: <MachineIcon className="w-5 h-5 text-gray-400" />,
    },
    {
      label: "Total Employees",
      value: employees.length,
      sub: `${locations.length} locations`,
      subColor: "text-gray-500",
      icon: <Users className="w-5 h-5 text-gray-400" />,
    },
    {
      label: "Today's Entries",
      value: productionEntries.length,
      sub: `${totalUnits} parts total`,
      subColor: "text-gray-500",
      icon: <TrendingUp className="w-5 h-5 text-gray-400" />,
    },
    {
      label: "Avg Cycle Time",
      value: avgCycleTime,
      sub: "minutes per cycle",
      subColor: "text-gray-500",
      icon: <Clock className="w-5 h-5 text-gray-400" />,
    },
  ];

  const quickActions = [
    { href: "/machines", icon: <MachineIcon className="w-5 h-5 text-primary-600" />, title: "Manage Machines", desc: "Configure CNC machines" },
    { href: "/employees", icon: <Users className="w-5 h-5 text-primary-600" />, title: "Manage Employees", desc: "Add and assign operators" },
    { href: "/production", icon: <BarChart3 className="w-5 h-5 text-primary-600" />, title: "View Production", desc: "Analytics and reports" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your manufacturing operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">{card.label}</span>
              {card.icon}
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className={`text-sm mt-1 ${card.subColor}`}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-200 hover:shadow-sm transition-all"
          >
            <div className="mb-2">{action.icon}</div>
            <p className="font-semibold text-gray-900">{action.title}</p>
            <p className="text-sm text-gray-500">{action.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent Production Entries */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Production Entries</h2>
        <div className="space-y-3">
          {productionEntries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                  <MachineIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{entry.machineName}</p>
                  <p className="text-sm text-gray-500">by {entry.operatorName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {entry.axisPositions && entry.axisPositions.length > 0
                    ? `${entry.axisPositions.length} axes`
                    : `${entry.partsCount ?? 0} parts`}
                </p>
                <p className="text-sm text-gray-500">{entry.timestamp}</p>
              </div>
            </div>
          ))}
          {productionEntries.length === 0 && (
            <p className="text-gray-400 text-center py-8">No production entries yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
