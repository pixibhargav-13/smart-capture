"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/context";
import Modal from "@/components/Modal";
import {
  LayoutDashboard, Settings as SettingsIcon, MapPin, Users, BarChart3, X, Camera, LogOut, Clock as ClockIcon, Bell,
  LineChart, CalendarCheck, AlertTriangle, Play, RotateCcw, Square
} from "lucide-react";
import {
  isWindowOpen, secondsInWindow, secondsUntilNextSlot,
  isDemoMode, enableDemoMode, disableDemoMode, resetDemoWindow,
  DEMO_INTERVAL, DEMO_WINDOW,
} from "@/lib/slots";

// Machine icon for nav items
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

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/machines", label: "Machines", icon: MachineIcon },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/production", label: "Production", icon: BarChart3 },
  { href: "/charts", label: "Charts", icon: LineChart },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/capture", label: "Capture", icon: Camera },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useApp();

  // timerMode: 'open' = capture window is active right now
  //            'waiting' = between slots, counting down to next slot
  const [timerMode, setTimerMode] = useState<"open" | "waiting">("waiting");
  const [timeLeft, setTimeLeft] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  // track whether popup has already been shown for the current open window
  const shownForSlot = useRef<number>(-1);

  // Effective interval/window (demo overrides real settings)
  const intervalMin = demoActive ? DEMO_INTERVAL : (settings.captureIntervalMinutes || 60);
  const windowMin = demoActive ? DEMO_WINDOW : (settings.captureWindowMinutes || 15);

  useEffect(() => {
    const tick = () => {
      const windowOpen = isWindowOpen(intervalMin, windowMin);
      setTimerMode(windowOpen ? "open" : "waiting");

      if (windowOpen) {
        const secs = secondsInWindow(intervalMin, windowMin);
        setTimeLeft(secs);

        // Show popup once per slot opening
        const midnight = new Date(); midnight.setHours(0,0,0,0);
        const slotIdx = Math.floor((Date.now() - midnight.getTime()) / (intervalMin * 60_000));
        if (shownForSlot.current !== slotIdx) {
          shownForSlot.current = slotIdx;
          setShowPopup(true);
        }
      } else {
        setTimeLeft(secondsUntilNextSlot(intervalMin));
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [intervalMin, windowMin, demoActive]);

  const handleDemoToggle = () => {
    if (isDemoMode()) {
      disableDemoMode();
      setDemoActive(false);
      shownForSlot.current = -1;
    } else {
      enableDemoMode();
      setDemoActive(true);
      shownForSlot.current = -1;
    }
  };

  const handleResetWindow = () => {
    resetDemoWindow();
    shownForSlot.current = -1;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

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
            <Image src="/logo.svg" alt="Smart CNC Capture" width={48} height={48} className="rounded-lg object-contain" />
            <span className="font-bold text-[15px] text-gray-900">Smart CNC Capture</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capture Window Timer */}
        {timerMode === "open" ? (
          // ── WINDOW IS OPEN ──────────────────────────────────────────────
          <div className="mx-4 mt-5 mb-1 bg-red-50 border-2 border-red-400 rounded-xl p-4 relative overflow-hidden animate-pulse-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Capture Now!
                {demoActive && <span className="ml-1 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-[9px] rounded-full font-bold">DEMO</span>}
              </span>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
            <div className="text-3xl font-mono font-bold text-red-700 tracking-tight">{formatTime(timeLeft)}</div>
            <p className="text-[10px] text-red-500 mt-1 font-medium">
              Window closes — {windowMin}m slot open
            </p>
          </div>
        ) : (
          // ── WAITING FOR NEXT SLOT ────────────────────────────────────────
          <div className="mx-4 mt-5 mb-1 bg-gray-50 border border-gray-200 rounded-xl p-4 relative overflow-hidden shadow-inner">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Next Slot Opens
                {demoActive && <span className="ml-1 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-[9px] rounded-full font-bold">DEMO</span>}
              </span>
              <ClockIcon className="w-3.5 h-3.5 text-primary-500" />
            </div>
            <div className="text-3xl font-mono font-bold text-gray-900 tracking-tight">{formatTime(timeLeft)}</div>
            <p className="text-[10px] text-gray-400 mt-1">
              Every {intervalMin}m · {windowMin}m window
            </p>
          </div>
        )}

        {/* Demo Controls */}
        <div className="mx-4 mt-2 mb-1 flex gap-1.5">
          <button
            onClick={handleDemoToggle}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
              demoActive
                ? "bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200"
                : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 hover:text-gray-700"
            }`}
          >
            {demoActive ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {demoActive ? "Stop Demo" : "Demo Mode"}
          </button>
          {demoActive && (
            <button
              onClick={handleResetWindow}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
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

      {/* Global Capture Alert Modal */}
      <Modal isOpen={showPopup} onClose={() => setShowPopup(false)} title="Capture Window Open!">
        <div className="text-center py-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm ring-1 ring-red-50">
            <Bell className="w-10 h-10 text-red-600 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Capture Window Open!</h3>
          <p className="text-sm text-gray-500 mb-2 px-4">
            A new slot just opened. You have <strong>{windowMin} minutes</strong> to capture all active machines.
          </p>
          <p className="text-xs text-red-500 font-semibold mb-4">Miss this window → slot marked as Missed.</p>
          <button 
            onClick={() => { setShowPopup(false); router.push("/capture"); onClose(); }}
            className="w-full px-4 py-3.5 bg-red-600 text-white rounded-lg font-bold text-base hover:bg-red-700 transition-colors shadow-sm tracking-wide"
          >
            Go to Capture Screen
          </button>
        </div>
      </Modal>
    </>
  );
}

