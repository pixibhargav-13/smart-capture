"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/lib/context";
import { extractCncData } from "@/lib/ocr";
import Modal from "@/components/Modal";
import {
  Camera, CheckCircle, Clock, RotateCcw, Upload, Loader2,
  FileText, Gauge, Zap, Monitor, AlertOctagon, Save, TrendingUp, Bell
} from "lucide-react";

export default function CapturePage() {
  const { machines, settings, addProductionEntry, getEmployeeById, productionEntries } = useApp();

  const [selectedMachine, setSelectedMachine] = useState("");
  const [captureImage, setCaptureImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<ReturnType<typeof emptyOcr> | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [step, setStep] = useState<"select" | "capture" | "processing" | "review" | "done">("select");
  const [timeLeft, setTimeLeft] = useState(settings.captureIntervalMinutes * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [showTimerAlert, setShowTimerAlert] = useState(false);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const machine = machines.find((m) => m.id === selectedMachine);
  const operator = machine ? getEmployeeById(machine.operatorId) : null;

  // Count entries for this employee in the current interval window
  const intervalMs = settings.captureIntervalMinutes * 60 * 1000;
  const windowStart = Date.now() - intervalMs;
  const intervalCount = productionEntries.filter(
    (e) => e.machineId === selectedMachine && new Date(e.timestamp).getTime() > windowStart
  ).length;

  // Countdown timer
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { 
          setTimerActive(false); 
          setShowTimerAlert(true); // show the popup!
          return 0; 
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerActive, timeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSelectMachine = () => {
    if (!selectedMachine) return;
    setStep("capture");
    setTimeLeft(settings.captureIntervalMinutes * 60);
    setTimerActive(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const now = new Date();
    setCapturedAt(now);

    const reader = new FileReader();
    reader.onload = (ev) => setCaptureImage(ev.target?.result as string);
    reader.readAsDataURL(file);

    setStep("processing");
    setOcrProgress(0);
    setTimerActive(false);

    try {
      const result = await extractCncData(file, (p) => setOcrProgress(p));
      setOcrResult(result);
    } catch {
      setOcrResult(emptyOcr());
    }
    setStep("review");
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!machine || saving) return;
    setSaving(true);
    try {
      await addProductionEntry({
        machineId: machine.id,
        machineName: machine.name,
        operatorName: operator?.name ?? "Unknown",
        partsCount: ocrResult?.partsCount ?? null,
        capturedAt: capturedAt?.toISOString() ?? new Date().toISOString(),
        timestamp: capturedAt?.toISOString() ?? new Date().toISOString(),
        captureImage: captureImage ?? undefined,
        ocrData: JSON.stringify(ocrResult ?? {}),
        axisPositions: ocrResult?.axisPositions ?? [],
        programNumber: ocrResult?.programNumber ?? null,
        cycleTime: ocrResult?.cycleTime ?? null,
        warnings: ocrResult?.warnings ?? null,
        displayReadable: ocrResult?.displayReadable ?? false,
      });
      setStep("done");
      // Auto-restart the timer for the next hour interval immediately after saving!
      setTimeLeft(settings.captureIntervalMinutes * 60);
      setTimerActive(true);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedMachine("");
    setCaptureImage(null);
    setOcrResult(null);
    setOcrProgress(0);
    setCapturedAt(null);
    setStep("select");
    setTimerActive(false);
    setTimeLeft(settings.captureIntervalMinutes * 60);
  };

  const steps = ["select", "capture", "processing", "review", "done"];
  const stepLabels = ["Machine", "Photo", "AI Analysis", "Review", "Done"];

  const handleTimerAlertAcknowledge = () => {
    setShowTimerAlert(false);
    setStep("capture"); // Automatically go to capture photo screen
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Capture</h1>
        <p className="text-gray-500 mt-1">Take a photo — AI reads the CNC display and saves automatically</p>
      </div>

      <div className="max-w-2xl">
        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {stepLabels.map((label, i) => {
            const idx = steps.indexOf(step);
            const isActive = i === idx;
            const isDone = i < idx;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isDone ? "bg-green-500 text-white" : isActive ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {isDone ? <CheckCircle className="w-4 h-4" /> : isActive && step === "processing" ? <Loader2 className="w-4 h-4 animate-spin" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${isActive ? "text-primary-600" : "text-gray-400"}`}>{label}</span>
                {i < stepLabels.length - 1 && <div className={`flex-1 h-0.5 ${isDone ? "bg-green-500" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Select Machine */}
        {step === "select" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Select Machine</h2>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Choose a machine...</option>
              {machines.filter((m) => m.status === "active").map((m) => {
                const op = getEmployeeById(m.operatorId);
                return <option key={m.id} value={m.id}>{m.name} — {m.type} ({op?.name ?? "Unassigned"})</option>;
              })}
            </select>

            {machine && (
              <div className="p-4 bg-gray-50 rounded-lg text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-gray-500">Machine</span><span className="font-medium">{machine.name} ({machine.type})</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Operator</span><span className="font-medium">{operator?.name ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Capture interval</span><span className="font-medium">Every {settings.captureIntervalMinutes} min</span></div>
              </div>
            )}

            <button
              onClick={handleSelectMachine}
              disabled={!selectedMachine}
              className="w-full px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              Start Capture Session
            </button>
          </div>
        )}

        {/* Step 2: Capture */}
        {step === "capture" && (
          <div className="space-y-4">
            {/* Timer */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-500">Next capture in</span>
              </div>
              <p className={`text-5xl font-bold font-mono ${timeLeft === 0 ? "text-red-600 animate-pulse" : "text-gray-900"}`}>
                {formatTime(timeLeft)}
              </p>
              {timeLeft === 0 && (
                <p className="text-red-600 font-medium mt-2 text-sm">⚠️ Capture is due now!</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {machine?.name} · <span className="font-medium">{operator?.name ?? "Unassigned"}</span>
              </p>
            </div>

            {/* Capture buttons */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-bold text-gray-900">Capture CNC Display Photo</h3>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="w-full border-2 border-dashed border-primary-300 bg-primary-50/40 rounded-xl p-8 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <Camera className="w-12 h-12 text-primary-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-primary-700">Take Photo</p>
                <p className="text-xs text-primary-500 mt-1">AI will instantly read all values from the display</p>
              </button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Upload className="w-4 h-4" /> Upload from Gallery
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === "processing" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {captureImage && (
              <picture><img src={captureImage} alt="Processing" className="w-full rounded-lg max-h-48 object-contain bg-gray-50 mb-5" /></picture>
            )}
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-1">AI Reading CNC Display...</h3>
              <p className="text-sm text-gray-500 mb-4">Extracting axis positions, program number, cycle time and more</p>
              <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                <div className="bg-primary-500 h-3 rounded-full transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
              </div>
              <p className="text-xs text-gray-400">{ocrProgress}% complete</p>
            </div>
          </div>
        )}

        {/* Step 4: Review & Save */}
        {step === "review" && ocrResult && (
          <div className="space-y-4">
            {/* Captured image */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">Captured Photo</h3>
                {capturedAt && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {capturedAt.toLocaleTimeString()}
                  </span>
                )}
              </div>
              {captureImage && (
                <picture><img src={captureImage} alt="Captured" className="w-full rounded-lg max-h-64 object-contain bg-gray-50" /></picture>
              )}
            </div>

            {/* AI Extracted Data */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">AI Extracted Data</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  ocrResult.displayReadable ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                }`}>
                  {ocrResult.displayReadable ? "Display readable" : "Low readability"}
                </span>
              </div>

              {/* Parts Count */}
              {ocrResult.partsCount !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-blue-700 mb-1">Parts Count</p>
                  <p className="text-3xl font-bold text-blue-900">{ocrResult.partsCount} units</p>
                </div>
              )}

              {/* Axis Positions — primary grid */}
              {ocrResult.axisPositions.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Axis Positions</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ocrResult.axisPositions.map((pos) => (
                      <div key={pos.axis} className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                        <p className="text-xs text-gray-500 mb-0.5">{pos.axis} Axis</p>
                        <p className="font-mono font-bold text-gray-900">{pos.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {ocrResult.programNumber && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                    <FileText className="w-3 h-3" /> Program: {ocrResult.programNumber}
                  </span>
                )}
                {ocrResult.machineMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                    <Monitor className="w-3 h-3" /> Mode: {ocrResult.machineMode}
                  </span>
                )}
                {ocrResult.cycleTime && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                    <Clock className="w-3 h-3" /> Cycle: {ocrResult.cycleTime}
                  </span>
                )}
                {ocrResult.spindleSpeed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium">
                    <Gauge className="w-3 h-3" /> Spindle: {ocrResult.spindleSpeed}
                  </span>
                )}
                {ocrResult.feedRate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">
                    <Zap className="w-3 h-3" /> Feed: {ocrResult.feedRate}
                  </span>
                )}
              </div>

              {/* Warning */}
              {ocrResult.warnings && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm">
                  <AlertOctagon className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">Machine Warning</p>
                    <p className="text-red-600">{ocrResult.warnings}</p>
                  </div>
                </div>
              )}

              {/* AI Notes */}
              {ocrResult.confidenceNotes && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> View AI analysis notes
                  </summary>
                  <p className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-600">{ocrResult.confidenceNotes}</p>
                </details>
              )}
            </div>

            {/* Interval count */}
            {selectedMachine && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {intervalCount} capture{intervalCount !== 1 ? "s" : ""} this interval
                  </p>
                  <p className="text-xs text-gray-500">{operator?.name} · last {settings.captureIntervalMinutes} min</p>
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Entry"}
            </button>

            <button
              onClick={() => { setStep("capture"); setTimerActive(true); setTimeLeft(settings.captureIntervalMinutes * 60); }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Retake Photo
            </button>
          </div>
        )}

        {/* Step 5: Done */}
        {step === "done" && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Entry Saved!</h2>
            <p className="text-gray-500 text-sm mb-1">
              {machine?.name} · {operator?.name}
            </p>
            {capturedAt && (
              <p className="text-xs text-gray-400 mb-2 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Captured at {capturedAt.toLocaleTimeString()}
              </p>
            )}
            {ocrResult?.partsCount !== null && (
              <p className="text-2xl font-bold text-green-700 mb-4">{ocrResult?.partsCount} parts recorded</p>
            )}
            <p className="text-sm text-gray-500 mb-6">{intervalCount} capture{intervalCount !== 1 ? "s" : ""} in the last {settings.captureIntervalMinutes} min</p>
            <button onClick={handleReset} className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
              <RotateCcw className="w-4 h-4" /> New Capture
            </button>
          </div>
        )}
      </div>
      {/* Timer Hit Zero Alert Modal */}
      <Modal isOpen={showTimerAlert} onClose={handleTimerAlertAcknowledge} title="Next Capture Due!">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm ring-1 ring-red-50">
            <Bell className="w-8 h-8 text-red-600 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Time for {operator?.name}'s Photo!</h3>
          <p className="text-sm text-gray-500 mb-6">It has been {settings.captureIntervalMinutes} minutes since the last capture for {machine?.name}.</p>
          <button 
            onClick={handleTimerAlertAcknowledge}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm"
          >
            Take Photo Now
          </button>
        </div>
      </Modal>

    </div>
  );
}

function emptyOcr() {
  return {
    rawText: "",
    partsCount: null as number | null,
    cycleTime: null as string | null,
    programNumber: null as string | null,
    axisPositions: [] as { axis: string; value: string }[],
    confidence: 0,
    spindleSpeed: null as string | null,
    feedRate: null as string | null,
    machineMode: null as string | null,
    warnings: null as string | null,
    displayReadable: false,
    confidenceNotes: "Analysis failed",
  };
}
