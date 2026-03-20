// Prototype in-memory data store with React context

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
  units: number;
  timestamp: string;
  captureImage?: string;
  ocrData?: string;
  manualData?: string;
  verified: boolean;
}

export interface CaptureSession {
  id: string;
  machineId: string;
  machineName: string;
  operatorId: string;
  operatorName: string;
  startedAt: string;
  nextCaptureAt: string;
  captureIntervalMinutes: number;
  status: "waiting" | "capture_due" | "reviewing";
}

export interface Settings {
  captureIntervalMinutes: number;
  companyName: string;
}

// Default data
export const defaultLocations: Location[] = [
  { id: "loc-1", name: "Ground Floor", description: "Main production area" },
  { id: "loc-2", name: "First Floor", description: "Secondary production area" },
  { id: "loc-3", name: "Cutting Section", description: "Cutting and trimming" },
  { id: "loc-4", name: "Polishing Section", description: "Finishing area" },
];

export const defaultEmployees: Employee[] = [
  { id: "emp-1", name: "John Smith", email: "john@factory.com", phone: "+1234567890", assignedMachines: ["m-1", "m-2"] },
  { id: "emp-2", name: "Maria Garcia", email: "maria@factory.com", phone: "+1234567891", assignedMachines: ["m-3"] },
  { id: "emp-3", name: "Ahmed Khan", email: "ahmed@factory.com", phone: "+1234567892", assignedMachines: ["m-4", "m-5"] },
];

export const defaultMachines: Machine[] = [
  { id: "m-1", name: "CNC-01", type: "CNC Milling", locationId: "loc-1", operatorId: "emp-1", status: "active", lastUpdate: "16m ago" },
  { id: "m-2", name: "CNC-02", type: "CNC Lathe", locationId: "loc-1", operatorId: "emp-1", status: "idle", lastUpdate: "46m ago" },
  { id: "m-3", name: "CNC-03", type: "CNC Milling", locationId: "loc-2", operatorId: "emp-2", status: "active", lastUpdate: "11m ago" },
  { id: "m-4", name: "CNC-04", type: "CNC Router", locationId: "loc-3", operatorId: "emp-3", status: "maintenance", lastUpdate: "121m ago" },
  { id: "m-5", name: "CNC-05", type: "CNC Grinding", locationId: "loc-4", operatorId: "emp-3", status: "active", lastUpdate: "6m ago" },
];

export const defaultProductionEntries: ProductionEntry[] = [
  { id: "pe-1", machineId: "m-1", machineName: "CNC-01", operatorName: "John Smith", units: 45, timestamp: "16m ago", verified: true },
  { id: "pe-2", machineId: "m-2", machineName: "CNC-02", operatorName: "John Smith", units: 38, timestamp: "46m ago", verified: true },
  { id: "pe-3", machineId: "m-3", machineName: "CNC-03", operatorName: "Maria Garcia", units: 52, timestamp: "11m ago", verified: false },
];

export const defaultSettings: Settings = {
  captureIntervalMinutes: 60,
  companyName: "Smart CNC Capture",
};
