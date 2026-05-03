// Slot system — fixed clock-aligned capture windows
// Example with 60-min interval, 15-min window:
//   Slot 0: opens 00:00, window closes 00:15, slot ends 01:00
//   Slot 1: opens 01:00, window closes 01:15, slot ends 02:00
//   ...
//   If no capture by 00:15 → slot 0 is MISSED for that machine

import type { ProductionEntry } from "./context";

export type SlotStatus = "captured" | "missed" | "open" | "upcoming";

export interface SlotInfo {
  index: number;         // 0 = midnight slot, 1 = next slot, etc.
  start: Date;           // when slot opens (capture window opens)
  windowEnd: Date;       // when capture window closes (start + windowMinutes)
  slotEnd: Date;         // when slot ends / next slot begins (start + intervalMinutes)
  label: string;         // "12 AM", "1 PM", "2:30 PM", etc.
  shortLabel: string;    // "12A", "1P", etc.
  status: SlotStatus;
  capturedAt?: string;   // ISO — only if status === 'captured'
  partsCount?: number | null;
  operatorName?: string;
  cycleTimeSeconds?: number | null;
}

// ── Demo Mode ─────────────────────────────────────────────────────────────
// Shifts the virtual clock so we can open a fresh window on demand.
// Production code is untouched — only the "now" input changes.

let _demoMode = false;
let _demoOffset = 0; // ms added to Date.now() to shift virtual time

export const DEMO_INTERVAL = 3;   // minutes between slots in demo mode
export const DEMO_WINDOW   = 2;   // minutes the capture window stays open

/** Virtual "now" used by all slot calculations */
function now(): number {
  return Date.now() + _demoOffset;
}

export function isDemoMode(): boolean { return _demoMode; }

export function enableDemoMode(): void {
  _demoMode = true;
  resetDemoWindow();           // immediately open a window
}

export function disableDemoMode(): void {
  _demoMode = false;
  _demoOffset = 0;
}

/** Shift the virtual clock so we land exactly at the start of a new slot */
export function resetDemoWindow(): void {
  const intervalMs = DEMO_INTERVAL * 60_000;
  const midnight = todayMidnight().getTime();
  const realElapsed = Date.now() - midnight;
  const positionInSlot = realElapsed % intervalMs;
  // offset = how much to subtract to get positionInSlot → 0
  _demoOffset = -positionInSlot;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatLabel(d: Date): string {
  return d.toLocaleTimeString("en", { hour: "numeric", minute: d.getMinutes() !== 0 ? "2-digit" : undefined, hour12: true });
}
function formatShort(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h < 12 ? "A" : "P";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

// Return today's midnight as a Date
export function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// How many slots fit in a day
function slotsPerDay(intervalMinutes: number): number {
  return Math.floor(1440 / intervalMinutes);
}

// Get the slot index that contains `now`
export function currentSlotIndex(intervalMinutes: number): number {
  const midnight = todayMidnight().getTime();
  const elapsed = now() - midnight;
  return Math.floor(elapsed / (intervalMinutes * 60_000));
}

// Is the capture window currently open?
export function isWindowOpen(intervalMinutes: number, windowMinutes: number): boolean {
  const midnight = todayMidnight().getTime();
  const elapsed = now() - midnight;
  const intervalMs = intervalMinutes * 60_000;
  const windowMs = windowMinutes * 60_000;
  const positionInSlot = elapsed % intervalMs;
  return positionInSlot < windowMs;
}

// Seconds until the next slot starts (ignores window, pure slot boundary)
export function secondsUntilNextSlot(intervalMinutes: number): number {
  const midnight = todayMidnight().getTime();
  const elapsed = now() - midnight;
  const intervalMs = intervalMinutes * 60_000;
  const positionInSlot = elapsed % intervalMs;
  return Math.ceil((intervalMs - positionInSlot) / 1000);
}

// Seconds remaining in the current open window (0 if window is not open)
export function secondsInWindow(intervalMinutes: number, windowMinutes: number): number {
  const midnight = todayMidnight().getTime();
  const elapsed = now() - midnight;
  const intervalMs = intervalMinutes * 60_000;
  const windowMs = windowMinutes * 60_000;
  const positionInSlot = elapsed % intervalMs;
  if (positionInSlot >= windowMs) return 0;
  return Math.ceil((windowMs - positionInSlot) / 1000);
}

// Build today's slot list for a specific machine.
// Returns slots from midnight up to currentSlot + upcomingCount.
export function buildMachineSlots(
  machineId: string,
  entries: ProductionEntry[],
  intervalMinutes: number,
  windowMinutes: number,
  upcomingCount = 3,
): SlotInfo[] {
  const midnight = todayMidnight();
  const intervalMs = intervalMinutes * 60_000;
  const windowMs = windowMinutes * 60_000;
  const virtualNow = now();

  const curIdx = Math.floor((virtualNow - midnight.getTime()) / intervalMs);
  const total = Math.min(curIdx + 1 + upcomingCount, slotsPerDay(intervalMinutes));

  const slots: SlotInfo[] = [];

  for (let i = 0; i < total; i++) {
    const start = new Date(midnight.getTime() + i * intervalMs);
    const windowEnd = new Date(start.getTime() + windowMs);
    const slotEnd = new Date(start.getTime() + intervalMs);

    // Find a capture for this machine within this slot's full interval
    const capture = entries.find((e) => {
      if (e.machineId !== machineId) return false;
      const t = new Date(e.capturedAt).getTime();
      return t >= start.getTime() && t < slotEnd.getTime();
    });

    let status: SlotStatus;
    if (capture) {
      status = "captured";
    } else if (virtualNow > windowEnd.getTime()) {
      status = "missed";
    } else if (virtualNow >= start.getTime()) {
      status = "open";
    } else {
      status = "upcoming";
    }

    slots.push({
      index: i,
      start,
      windowEnd,
      slotEnd,
      label: formatLabel(start),
      shortLabel: formatShort(start),
      status,
      capturedAt: capture?.capturedAt,
      partsCount: capture?.partsCount,
      operatorName: capture?.operatorName,
      cycleTimeSeconds: capture?.cycleTimeSeconds,
    });
  }

  return slots;
}

// Get the current slot for a specific machine (the one that contains 'now')
export function getCurrentSlot(
  machineId: string,
  entries: ProductionEntry[],
  intervalMinutes: number,
  windowMinutes: number,
): SlotInfo {
  const slots = buildMachineSlots(machineId, entries, intervalMinutes, windowMinutes, 0);
  // Last element is always the current slot (upcomingCount=0)
  return slots[slots.length - 1] ?? buildMachineSlots(machineId, entries, intervalMinutes, windowMinutes, 1)[0];
}

// Seconds until the current window opens (0 if already open)
export function secondsUntilWindowOpens(intervalMinutes: number): number {
  return secondsUntilNextSlot(intervalMinutes);
}

// Summary counts for a machine's today slots
export function slotSummary(slots: SlotInfo[]) {
  const past = slots.filter((s) => s.status !== "upcoming");
  const captured = slots.filter((s) => s.status === "captured").length;
  const missed = slots.filter((s) => s.status === "missed").length;
  const open = slots.find((s) => s.status === "open") ?? null;
  const pct = past.length > 0 ? Math.round((captured / past.length) * 100) : 100;
  return { captured, missed, open, pct, total: past.length };
}
