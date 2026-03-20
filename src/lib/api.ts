// Central API client for the Smart Capture backend
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

export interface Employee {
  _id: string;
  name: string;
  email: string;
  phone: string;
  assignedMachines: string[];
  createdAt: string;
}

export interface Machine {
  _id: string;
  name: string;
  type: string;
  locationId: string | { _id: string; name: string } | null;
  operatorId: string | { _id: string; name: string; email: string } | null;
  status: "active" | "idle" | "maintenance";
  lastUpdate: string;
  createdAt: string;
}

export interface Location {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface ProductionEntry {
  _id: string;
  machineId: string;
  machineName: string;
  operatorName: string;
  capturedAt: string;          // when the photo was taken
  partsCount: number | null;   // AI-extracted parts count
  programNumber?: string | null;
  cycleTime?: string | null;
  axisPositions: { axis: string; value: string }[];
  spindleSpeed?: string | null;
  feedRate?: string | null;
  machineMode?: string | null;
  warnings?: string | null;
  displayReadable: boolean;
  ocrData?: string | null;     // full OCR JSON string (audit)
  captureImage?: string | null;
  createdAt: string;
}

export interface Settings {
  _id: string;
  captureIntervalMinutes: number;
  companyName: string;
}

export interface ProductionStats {
  totalEntries: number;
  todayEntries: number;
  totalParts: number;
}

export interface IntervalCount {
  _id: { machineId: string; operatorName: string };
  captures: number;
  totalParts: number;
}

export const employeesApi = {
  getAll: () => request<Employee[]>("/api/employees"),
  getById: (id: string) => request<Employee>(`/api/employees/${id}`),
  create: (data: Omit<Employee, "_id" | "createdAt">) =>
    request<Employee>("/api/employees", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Employee>) =>
    request<Employee>(`/api/employees/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ message: string }>(`/api/employees/${id}`, { method: "DELETE" }),
};

export const machinesApi = {
  getAll: () => request<Machine[]>("/api/machines"),
  getById: (id: string) => request<Machine>(`/api/machines/${id}`),
  create: (data: Omit<Machine, "_id" | "createdAt">) =>
    request<Machine>("/api/machines", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Machine>) =>
    request<Machine>(`/api/machines/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ message: string }>(`/api/machines/${id}`, { method: "DELETE" }),
};

export const locationsApi = {
  getAll: () => request<Location[]>("/api/locations"),
  getById: (id: string) => request<Location>(`/api/locations/${id}`),
  create: (data: Omit<Location, "_id" | "createdAt">) =>
    request<Location>("/api/locations", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Location>) =>
    request<Location>(`/api/locations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ message: string }>(`/api/locations/${id}`, { method: "DELETE" }),
};

export const productionApi = {
  getAll: (params?: { machineId?: string; operatorName?: string; limit?: number; page?: number; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.machineId) qs.set("machineId", params.machineId);
    if (params?.operatorName) qs.set("operatorName", params.operatorName);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.page) qs.set("page", String(params.page));
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    return request<{ entries: ProductionEntry[]; total: number; page: number; limit: number }>(
      `/api/production?${qs.toString()}`
    );
  },
  getStats: () => request<ProductionStats>("/api/production/stats"),
  getIntervalCounts: (intervalMinutes: number) =>
    request<IntervalCount[]>(`/api/production/interval-counts?intervalMinutes=${intervalMinutes}`),
  getById: (id: string) => request<ProductionEntry>(`/api/production/${id}`),
  create: (data: Omit<ProductionEntry, "_id" | "createdAt">) =>
    request<ProductionEntry>("/api/production", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ message: string }>(`/api/production/${id}`, { method: "DELETE" }),
};

export const settingsApi = {
  get: () => request<Settings>("/api/settings"),
  update: (data: Partial<Settings>) =>
    request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(data) }),
};
