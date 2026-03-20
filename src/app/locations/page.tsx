"use client";

import { useState } from "react";
import { useApp } from "@/lib/context";
import Modal from "@/components/Modal";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";

export default function LocationsPage() {
  const { locations, machines, addLocation, updateLocation, deleteLocation } = useApp();

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const openAdd = () => {
    setFormName(""); setFormDesc(""); setEditId(null); setShowAdd(true);
  };

  const openEdit = (id: string) => {
    const loc = locations.find((l) => l.id === id);
    if (!loc) return;
    setFormName(loc.name); setFormDesc(loc.description);
    setEditId(id); setShowAdd(true);
  };

  const handleSubmit = () => {
    if (!formName.trim()) return;
    if (editId) {
      updateLocation(editId, { name: formName, description: formDesc });
    } else {
      addLocation({ name: formName, description: formDesc });
    }
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    const machinesAtLoc = machines.filter((m) => m.locationId === id);
    if (machinesAtLoc.length > 0) {
      alert(`Cannot delete: ${machinesAtLoc.length} machine(s) assigned to this location.`);
      return;
    }
    if (confirm("Delete this location?")) deleteLocation(id);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-gray-500 mt-1">Manage factory locations and zones</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Location
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {locations.map((loc) => {
          const machineCount = machines.filter((m) => m.locationId === loc.id).length;
          const activeMachines = machines.filter((m) => m.locationId === loc.id && m.status === "active").length;
          return (
            <div key={loc.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{loc.name}</p>
                    <p className="text-sm text-gray-500">{loc.description}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm mb-4">
                <span className="text-gray-500">{machineCount} machine{machineCount !== 1 ? "s" : ""}</span>
                <span className="text-green-600">{activeMachines} active</span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => openEdit(loc.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(loc.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {locations.length === 0 && (
        <div className="text-center py-12 text-gray-400">No locations yet</div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={editId ? "Edit Location" : "Add New Location"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Ground Floor" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="e.g., Main production area" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
              {editId ? "Save Changes" : "Add Location"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
