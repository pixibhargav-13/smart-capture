"use client";

import { useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Sidebar from "./Sidebar";
import { Menu, LayoutDashboard, BarChart3, Camera, LineChart, MoreHorizontal } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/capture": "Capture",
  "/production": "Production",
  "/charts": "Charts",
  "/attendance": "Attendance",
  "/machines": "Machines",
  "/employees": "Employees",
  "/locations": "Locations",
  "/settings": "Settings",
};

const bottomNavItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/production", label: "Production", icon: BarChart3 },
  { href: "/capture", label: "Capture", icon: Camera, primary: true },
  { href: "/charts", label: "Charts", icon: LineChart },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 lg:hidden flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-bold text-gray-900 text-base flex-1 truncate">
            {pageTitle || "Smart CNC Capture"}
          </span>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">{children}</main>
      </div>

      {/* Bottom navigation — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 lg:hidden safe-area-inset-bottom">
        <div className="flex items-stretch h-16">
          {bottomNavItems.map(({ href, label, icon: Icon, primary }) => {
            const isActive = pathname === href;

            if (primary) {
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
                  aria-label={label}
                >
                  {/* Floating capture button */}
                  <div className={`w-12 h-12 -mt-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-colors ${
                    isActive ? "bg-primary-700" : "bg-primary-600"
                  }`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`text-[10px] font-semibold mt-0.5 ${isActive ? "text-primary-600" : "text-gray-500"}`}>
                    {label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                  isActive ? "text-primary-600" : "text-gray-400 hover:text-gray-600"
                }`}
                aria-label={label}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}

          {/* More button — opens sidebar */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="More"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
