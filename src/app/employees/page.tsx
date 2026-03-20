"use client";

import { useState } from "react";
import { useApp } from "@/lib/context";
import Modal from "@/components/Modal";
import { Plus, Pencil, Trash2, Mail, Phone, History, Camera } from "lucide-react";

export default function EmployeesPage() {
  const { employees, machines, productionEntries, addEmployee, updateEmployee, deleteEmployee } = useApp();

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");

  const [viewCapturesId, setViewCapturesId] = useState<string | null>(null);

  const openAdd = () => {
    setFormName(""); setFormEmail(""); setFormPhone("");
    setEditId(null); setShowAdd(true);
  };

  const openEdit = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    setFormName(emp.name); setFormEmail(emp.email); setFormPhone(emp.phone);
    setEditId(id); setShowAdd(true);
  };

  const handleSubmit = () => {
    if (!formName.trim()) return;
    if (editId) {
      updateEmployee(editId, { name: formName, email: formEmail, phone: formPhone });
    } else {
      addEmployee({ name: formName, email: formEmail, phone: formPhone, assignedMachines: [] });
    }
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this employee?")) deleteEmployee(id);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-500 mt-1">Manage operators and assignments</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Desktop Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hidden md:block">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3.5 text-sm font-semibold text-gray-600">Employee</th>
              <th className="text-left px-5 py-3.5 text-sm font-semibold text-gray-600">Contact</th>
              <th className="text-left px-5 py-3.5 text-sm font-semibold text-gray-600">Assigned Machines</th>
              <th className="text-right px-5 py-3.5 text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((emp) => {
              const assignedMachines = machines.filter((m) => m.operatorId === emp.id);
              return (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-50 rounded-full flex items-center justify-center text-sm font-semibold text-primary-600">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-500">ID: {emp.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Mail className="w-3.5 h-3.5" /> {emp.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Phone className="w-3.5 h-3.5" /> {emp.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                        {assignedMachines.length} machine{assignedMachines.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-sm text-gray-500">
                        {assignedMachines.map((m) => m.name).join(", ")}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewCapturesId(emp.name)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary-200 bg-primary-50 rounded-lg text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors">
                        <History className="w-3.5 h-3.5" /> History
                      </button>
                      <button onClick={() => openEdit(emp.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => handleDelete(emp.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {employees.map((emp) => {
          const assignedMachines = machines.filter((m) => m.operatorId === emp.id);
          return (
            <div key={emp.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center text-sm font-semibold text-primary-600">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{emp.name}</p>
                  <p className="text-xs text-gray-500">ID: {emp.id}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-sm mb-3">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Mail className="w-3.5 h-3.5" /> {emp.email}
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Phone className="w-3.5 h-3.5" /> {emp.phone}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                  {assignedMachines.length} machine{assignedMachines.length !== 1 ? "s" : ""}
                </span>
                <span className="text-sm text-gray-500">{assignedMachines.map((m) => m.name).join(", ")}</span>
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100 mt-3">
                <button onClick={() => setViewCapturesId(emp.name)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-primary-200 bg-primary-50 rounded-lg text-sm font-medium text-primary-700 hover:bg-primary-100">
                  <History className="w-3.5 h-3.5" /> History
                </button>
                <button onClick={() => openEdit(emp.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(emp.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {employees.length === 0 && (
        <div className="text-center py-12 text-gray-400">No employees yet</div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={editId ? "Edit Employee" : "Add New Employee"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., John Smith" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} type="email" placeholder="e.g., john@factory.com" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} type="tel" placeholder="+1234567890" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
              {editId ? "Save Changes" : "Add Employee"}
            </button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={!!viewCapturesId} onClose={() => setViewCapturesId(null)} title={`Capture History: ${viewCapturesId}`}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {viewCapturesId && (() => {
            const employeeEntries = productionEntries.filter((e) => e.operatorName === viewCapturesId).slice(0, 20); // last 20
            if (employeeEntries.length === 0) return <p className="text-gray-500 text-sm text-center py-6">No captures recorded for this employee yet.</p>;

            return employeeEntries.map(entry => (
              <div key={entry.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary-600" />
                    <span className="font-semibold text-gray-900">{entry.machineName}</span>
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
