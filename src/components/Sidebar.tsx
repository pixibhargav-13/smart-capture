"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Settings as SettingsIcon, MapPin, Users, BarChart3, X, Camera, LogOut,
} from "lucide-react";

// 4BitX machine/gear icon inline SVG
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

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/machines", label: "Machines", icon: MachineIcon },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/production", label: "Production", icon: BarChart3 },
  { href: "/capture", label: "Capture", icon: Camera },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <MachineIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">Smart Capture</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
              <p className="text-xs text-gray-500 truncate">admin@factory.com</p>
            </div>
          </div>
          <button className="mt-3 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors w-full">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
