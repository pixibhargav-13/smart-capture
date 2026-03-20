"use client";

import { useState } from "react";
import { useApp } from "@/lib/context";
import { Save, Clock, Building2 } from "lucide-react";

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [interval, setInterval] = useState(settings.captureIntervalMinutes.toString());
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const mins = parseInt(interval);
    if (isNaN(mins) || mins < 1) return;
    updateSettings({ captureIntervalMinutes: mins, companyName });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const presets = [
    { label: "30 min", value: 30 },
    { label: "1 hour", value: 60 },
    { label: "2 hours", value: 120 },
    { label: "4 hours", value: 240 },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure system preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Company Name */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Company Name</h2>
              <p className="text-sm text-gray-500">Displayed in the sidebar and reports</p>
            </div>
          </div>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Capture Interval */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Capture Interval</h2>
              <p className="text-sm text-gray-500">How often employees must capture/upload a photo of the CNC machine display</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Interval (minutes)</label>
            <input
              type="number"
              min="1"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.value}
                onClick={() => setInterval(p.value.toString())}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  parseInt(interval) === p.value
                    ? "bg-primary-50 border-primary-200 text-primary-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>How it works:</strong> Every <strong>{interval} minutes</strong>, the assigned employee will be prompted to capture a photo of the CNC machine display. The system will extract data via OCR and compare it with the manually entered values. If both match, the entry is verified automatically.
            </p>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm"
        >
          <Save className="w-4 h-4" />
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
