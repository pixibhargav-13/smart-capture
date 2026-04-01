"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { employeesApi, machinesApi, locationsApi, productionApi, settingsApi } from "./api";

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedMachines: string[];
}

export interface Machine {
  id: string;
  name: string;
  type: string;
  locationId: string;
  operatorId: string;
  status: "active" | "idle" | "maintenance";
  lastUpdate: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
}

export interface ProductionEntry {
  id: string;
  machineId: string;
  machineName: string;
  operatorName: string;
  timestamp: string;
  capturedAt: string;
  partsCount: number | null;
  partGoal: number | null;
  cycleTimeSeconds: number | null;
  cycleTime?: string | null;
  runTime?: string | null;
  programTime?: string | null;
  programRemainder?: string | null;
  programProgressPercent?: number | null;
  captureImage?: string;
  ocrData?: string;
  axisPositions: { axis: string; value: string }[];
  machineCoordinates: { axis: string; value: string }[];
  distToGo: { axis: string; value: string }[];
  programNumber?: string | null;
  toolNumber?: string | null;
  spindleSpeed?: string | null;
  spindleSpeedSet?: string | null;
  feedRate?: string | null;
  machineMode?: string | null;
  warnings?: string | null;
  displayReadable: boolean;
}

export interface Settings {
  captureIntervalMinutes: number;
  captureWindowMinutes: number;   // how long the capture window stays open each slot
  companyName: string;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEmployee(e: any): Employee {
  return {
    id: e._id ?? e.id,
    name: e.name,
    email: e.email,
    phone: e.phone ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assignedMachines: (e.assignedMachines ?? []).map((m: any) =>
      typeof m === "object" ? m._id ?? m.id : m
    ),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMachine(m: any): Machine {
  return {
    id: m._id ?? m.id,
    name: m.name,
    type: m.type,
    locationId: typeof m.locationId === "object" && m.locationId ? m.locationId._id ?? m.locationId.id : m.locationId ?? "",
    operatorId: typeof m.operatorId === "object" && m.operatorId ? m.operatorId._id ?? m.operatorId.id : m.operatorId ?? "",
    status: m.status ?? "idle",
    lastUpdate: m.lastUpdate ? timeAgo(m.lastUpdate) : "—",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeLocation(l: any): Location {
  return { id: l._id ?? l.id, name: l.name, description: l.description ?? "" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEntry(e: any): ProductionEntry {
  return {
    id: e._id ?? e.id,
    machineId: typeof e.machineId === "object" && e.machineId ? e.machineId._id ?? e.machineId.id : e.machineId,
    machineName: e.machineName,
    operatorName: e.operatorName,
    timestamp: e.capturedAt ? timeAgo(e.capturedAt) : (e.createdAt ? timeAgo(e.createdAt) : "Just now"),
    capturedAt: e.capturedAt ?? e.createdAt ?? new Date().toISOString(),
    partsCount: e.partsCount ?? null,
    partGoal: e.partGoal ?? null,
    cycleTimeSeconds: e.cycleTimeSeconds ?? null,
    cycleTime: e.cycleTime ?? null,
    runTime: e.runTime ?? null,
    programTime: e.programTime ?? null,
    programRemainder: e.programRemainder ?? null,
    programProgressPercent: e.programProgressPercent ?? null,
    captureImage: e.captureImage ?? undefined,
    ocrData: e.ocrData ?? undefined,
    axisPositions: e.axisPositions ?? [],
    machineCoordinates: e.machineCoordinates ?? [],
    distToGo: e.distToGo ?? [],
    programNumber: e.programNumber ?? null,
    toolNumber: e.toolNumber ?? null,
    spindleSpeed: e.spindleSpeed ?? null,
    spindleSpeedSet: e.spindleSpeedSet ?? null,
    feedRate: e.feedRate ?? null,
    machineMode: e.machineMode ?? null,
    warnings: e.warnings ?? null,
    displayReadable: e.displayReadable ?? false,
  };
}

interface AppState {
  employees: Employee[];
  machines: Machine[];
  locations: Location[];
  productionEntries: ProductionEntry[];
  settings: Settings;
  loading: boolean;
  addEmployee: (emp: Omit<Employee, "id">) => Promise<void>;
  updateEmployee: (id: string, emp: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addMachine: (machine: Omit<Machine, "id">) => Promise<void>;
  updateMachine: (id: string, machine: Partial<Machine>) => Promise<void>;
  deleteMachine: (id: string) => Promise<void>;
  addLocation: (loc: Omit<Location, "id">) => Promise<void>;
  updateLocation: (id: string, loc: Partial<Location>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  addProductionEntry: (entry: Omit<ProductionEntry, "id">) => Promise<void>;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  getEmployeeById: (id: string) => Employee | undefined;
  getLocationById: (id: string) => Location | undefined;
  getMachinesByLocation: (locationId: string) => Machine[];
  getMachinesByOperator: (operatorId: string) => Machine[];
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({ captureIntervalMinutes: 60, captureWindowMinutes: 15, companyName: "Smart CNC Capture" });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [emps, machs, locs, prod, sett] = await Promise.all([
        employeesApi.getAll(),
        machinesApi.getAll(),
        locationsApi.getAll(),
        productionApi.getAll({ limit: 100 }),
        settingsApi.get(),
      ]);
      setEmployees(emps.map(normalizeEmployee));
      setMachines(machs.map(normalizeMachine));
      setLocations(locs.map(normalizeLocation));
      setProductionEntries(prod.entries.map(normalizeEntry));
      setSettings({ captureIntervalMinutes: sett.captureIntervalMinutes, captureWindowMinutes: sett.captureWindowMinutes ?? 15, companyName: sett.companyName });
    } catch (err) {
      console.error("Failed to load data from backend:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addEmployee = async (emp: Omit<Employee, "id">) => {
    await employeesApi.create({ ...emp });
    await refresh();
  };
  const updateEmployee = async (id: string, data: Partial<Employee>) => {
    await employeesApi.update(id, data);
    await refresh();
  };
  const deleteEmployee = async (id: string) => {
    await employeesApi.delete(id);
    await refresh();
  };

  const addMachine = async (machine: Omit<Machine, "id">) => {
    await machinesApi.create({ ...machine, locationId: machine.locationId || null, operatorId: machine.operatorId || null, lastUpdate: new Date().toISOString() });
    await refresh();
  };
  const updateMachine = async (id: string, data: Partial<Machine>) => {
    await machinesApi.update(id, data);
    await refresh();
  };
  const deleteMachine = async (id: string) => {
    await machinesApi.delete(id);
    await refresh();
  };

  const addLocation = async (loc: Omit<Location, "id">) => {
    await locationsApi.create(loc);
    await refresh();
  };
  const updateLocation = async (id: string, data: Partial<Location>) => {
    await locationsApi.update(id, data);
    await refresh();
  };
  const deleteLocation = async (id: string) => {
    await locationsApi.delete(id);
    await refresh();
  };

  const addProductionEntry = async (entry: Omit<ProductionEntry, "id">) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ocrParsed: any = {};
    try { if (entry.ocrData) ocrParsed = JSON.parse(entry.ocrData); } catch { /* ignore */ }

    await productionApi.create({
      machineId: entry.machineId,
      machineName: entry.machineName,
      operatorName: entry.operatorName,
      capturedAt: entry.capturedAt,
      partsCount: entry.partsCount ?? ocrParsed.partsCount ?? null,
      partGoal: ocrParsed.partGoal ?? null,
      cycleTimeSeconds: ocrParsed.cycleTimeSeconds ?? null,
      cycleTime: ocrParsed.cycleTime ?? null,
      runTime: ocrParsed.runTime ?? null,
      programTime: ocrParsed.programTime ?? null,
      programRemainder: ocrParsed.programRemainder ?? null,
      programProgressPercent: ocrParsed.programProgressPercent ?? null,
      captureImage: entry.captureImage ?? null,
      ocrData: entry.ocrData ?? null,
      axisPositions: ocrParsed.axisPositions ?? [],
      machineCoordinates: ocrParsed.machineCoordinates ?? [],
      distToGo: ocrParsed.distToGo ?? [],
      programNumber: ocrParsed.programNumber ?? null,
      toolNumber: ocrParsed.toolNumber ?? null,
      spindleSpeed: ocrParsed.spindleSpeed ?? null,
      spindleSpeedSet: ocrParsed.spindleSpeedSet ?? null,
      feedRate: ocrParsed.feedRate ?? null,
      machineMode: ocrParsed.machineMode ?? null,
      warnings: ocrParsed.warnings ?? null,
      displayReadable: ocrParsed.displayReadable ?? false,
    });
    await refresh();
  };

  const updateSettings = async (s: Partial<Settings>) => {
    const updated = await settingsApi.update(s);
    setSettings({ captureIntervalMinutes: updated.captureIntervalMinutes, captureWindowMinutes: updated.captureWindowMinutes ?? 15, companyName: updated.companyName });
  };

  const getEmployeeById = (id: string) => employees.find((e) => e.id === id);
  const getLocationById = (id: string) => locations.find((l) => l.id === id);
  const getMachinesByLocation = (locationId: string) => machines.filter((m) => m.locationId === locationId);
  const getMachinesByOperator = (operatorId: string) => machines.filter((m) => m.operatorId === operatorId);

  return (
    <AppContext.Provider value={{
      employees, machines, locations, productionEntries, settings, loading,
      addEmployee, updateEmployee, deleteEmployee,
      addMachine, updateMachine, deleteMachine,
      addLocation, updateLocation, deleteLocation,
      addProductionEntry, updateSettings,
      getEmployeeById, getLocationById, getMachinesByLocation, getMachinesByOperator,
      refresh,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
