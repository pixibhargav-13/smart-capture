"use client";

import { useState } from "react";
import { useApp } from "@/lib/context";
import Modal from "@/components/Modal";
import { Plus, Pencil, Trash2, History, Camera } from "lucide-react";

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

const statusColors: Record<string, { dot: string; bg: string; text: string }> = {
  active: { dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700" },
  idle: { dot: "bg-yellow-500", bg: "bg-yellow-50", text: "text-yellow-700" },
  maintenance: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
};

export default function MachinesPage() {
  const {
    machines, employees, locations, productionEntries,
    addMachine, updateMachine, deleteMachine,
    getEmployeeById, getLocationById,
  } = useApp();

  const [filterLocation, setFilterLocation] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewCapturesId, setViewCapturesId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formOperator, setFormOperator] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "idle" | "maintenance">("idle");

  const filtered = filterLocation === "all" ? machines : machines.filter((m) => m.locationId === filterLocation);

  const openAdd = () => {
    setFormName(""); setFormType(""); setFormLocation(""); setFormOperator(""); setFormStatus("idle");
    setEditId(null); setShowAdd(true);
  };

  const openEdit = (id: string) => {
    const m = machines.find((x) => x.id === id);
    if (!m) return;
    setFormName(m.name); setFormType(m.type); setFormLocation(m.locationId);
    setFormOperator(m.operatorId); setFormStatus(m.status);
    setEditId(id); setShowAdd(true);
  };

  const handleSubmit = () => {
    if (!formName.trim()) return;
    const data = {
      name: formName, type: formType,
      locationId: formLocation || null,
      operatorId: formOperator || null,
      status: formStatus,
      lastUpdate: new Date().toISOString(),
    };
    if (editId) {
      updateMachine(editId, data);
    } else {
      addMachine(data);
    }
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this machine?")) deleteMachine(id);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Machine Management</h1>
          <p className="text-gray-500 mt-1">Configure and manage CNC machines</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Machine
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 font-medium">Filter by Location:</span>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <span className="text-sm text-gray-500">{filtered.length} machines</span>
      </div>

      {/* Machine Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((machine) => {
          const colors = statusColors[machine.status];
          const operator = getEmployeeById(machine.operatorId);
          const location = getLocationById(machine.locationId);
          return (
            <div key={machine.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <MachineIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{machine.name}</p>
                    <p className="text-sm text-gray-500">{machine.type}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                  {machine.status}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Location:</span>
                  <span className="font-medium text-gray-900">{location?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Operator:</span>
                  <span className="font-medium text-gray-900">{operator?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Update:</span>
                  <span className="font-medium text-gray-900">{machine.lastUpdate}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => setViewCapturesId(machine.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-primary-200 bg-primary-50 rounded-lg text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors">
                  <History className="w-3.5 h-3.5" /> History
                </button>
                <button onClick={() => openEdit(machine.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(machine.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">No machines found</div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={editId ? "Edit Machine" : "Add New Machine"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine Name</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., CNC-06" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine Type</label>
            <input value={formType} onChange={(e) => setFormType(e.target.value)} placeholder="e.g., CNC Milling" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
              <option value="">Select location</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Employee</label>
            <select value={formOperator} onChange={(e) => setFormOperator(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
              <option value="">Select employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as "active" | "idle" | "maintenance")} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
              <option value="idle">Idle</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
              {editId ? "Save Changes" : "Add Machine"}
            </button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={!!viewCapturesId} onClose={() => setViewCapturesId(null)} title={`Capture History`}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {viewCapturesId && (() => {
            const machine = machines.find(m => m.id === viewCapturesId);
            const machineEntries = productionEntries.filter((e) => e.machineId === viewCapturesId).slice(0, 20); // last 20
            if (machineEntries.length === 0) return <p className="text-gray-500 text-sm text-center py-6">No captures recorded for {machine?.name || 'this machine'} yet.</p>;

            return machineEntries.map(entry => (
              <div key={entry.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary-600" />
                    <span className="font-semibold text-gray-900">{entry.operatorName}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                    {new Date(entry.capturedAt).toLocaleString()}
                  </span>
                </div>
                
                {/* Axes */}
                {entry.axisPositions && entry.axisPositions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {entry.axisPositions.map(pos => (
                      <div key={pos.axis} className="bg-white px-2 py-1 rounded border border-gray-200 text-sm font-mono shadow-sm">
                        <span className="text-gray-500 font-bold mr-2">{pos.axis}</span>
                        <span className="text-gray-900">{pos.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic font-mono">No axis data read</p>
                )}
              </div>
            ));
          })()}
        </div>
      </Modal>
    </div>
  );
}
