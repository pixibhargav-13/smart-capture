"use client";

import { useState, ReactNode } from "react";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

export default function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
