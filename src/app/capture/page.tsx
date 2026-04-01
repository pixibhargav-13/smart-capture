"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/lib/context";
import { extractCncData } from "@/lib/ocr";
import {
  Camera, CheckCircle, Clock, RotateCcw, Upload, Loader2,
  FileText, Gauge, Zap, Monitor, AlertOctagon, Save, TrendingUp,
  Wrench, Target, Timer, Activity, AlertTriangle, XCircle, Lock
} from "lucide-react";
import {
  getCurrentSlot, isWindowOpen, secondsInWindow, secondsUntilNextSlot,
} from "@/lib/slots";

// ── Live slot-timer hook ───────────────────────────────────────────────────

function useSlotTimer(intervalMin: number, windowMin: number) {
  const [state, setState] = useState(() => {
    const open = isWindowOpen(intervalMin, windowMin);
    return {
      open,
      secs: open ? secondsInWindow(intervalMin, windowMin) : secondsUntilNextSlot(intervalMin),
    };
  });

  useEffect(() => {
    const tick = () => {
      const open = isWindowOpen(intervalMin, windowMin);
      setState({
        open,
        secs: open ? secondsInWindow(intervalMin, windowMin) : secondsUntilNextSlot(intervalMin),
      });
    };
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [intervalMin, windowMin]);

  return state;
}

function fmt(secs: number) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function CapturePage() {
  const { machines, settings, addProductionEntry, getEmployeeById, productionEntries } = useApp();

  const intervalMin = settings.captureIntervalMinutes || 60;
  const windowMin = settings.captureWindowMinutes || 15;

  const [selectedMachine, setSelectedMachine] = useState("");
  const [captureImage, setCaptureImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<ReturnType<typeof emptyOcr> | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [step, setStep] = useState<"select" | "capture" | "processing" | "review" | "done">("select");
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const timer = useSlotTimer(intervalMin, windowMin);

  const machine = machines.find((m) => m.id === selectedMachine);
  const operator = machine ? getEmployeeById(machine.operatorId) : null;

  // ── Per-machine slot check ───────────────────────────────────────────────
  // Recompute when machine, entries, or timer tick changes
  const currentSlot = selectedMachine
    ? getCurrentSlot(selectedMachine, productionEntries, intervalMin, windowMin)
    : null;

  const windowOpen = timer.open;
  const alreadyCaptured = currentSlot?.status === "captured";

  // Why capture is blocked (null = allowed)
  let blockReason: "window_closed" | "already_captured" | null = null;
  if (selectedMachine) {
    if (!windowOpen) blockReason = "window_closed";
    else if (alreadyCaptured) blockReason = "already_captured";
  }

  const canProceed = selectedMachine && blockReason === null;

  // Recent entries for this machine (for interval count display)
  const intervalMs = intervalMin * 60 * 1000;
  const windowStart = Date.now() - intervalMs;
  const intervalCount = productionEntries.filter(
    (e) => e.machineId === selectedMachine && new Date(e.capturedAt).getTime() > windowStart
  ).length;

  const handleSelectMachine = () => {
    if (!canProceed) return;
    setStep("capture");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Re-check window hasn't closed since step 1
    if (!isWindowOpen(intervalMin, windowMin)) {
      alert("The capture window has closed. Please wait for the next slot.");
      setStep("select");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const now = new Date();
    setCapturedAt(now);

    const reader = new FileReader();
    reader.onload = (ev) => setCaptureImage(ev.target?.result as string);
    reader.readAsDataURL(file);

    setStep("processing");
    setOcrProgress(0);

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
        partGoal: ocrResult?.partGoal ?? null,
        cycleTimeSeconds: ocrResult?.cycleTimeSeconds ?? null,
        capturedAt: capturedAt?.toISOString() ?? new Date().toISOString(),
        timestamp: capturedAt?.toISOString() ?? new Date().toISOString(),
        captureImage: captureImage ?? undefined,
        ocrData: JSON.stringify(ocrResult ?? {}),
        axisPositions: ocrResult?.axisPositions ?? [],
        machineCoordinates: ocrResult?.machineCoordinates ?? [],
        distToGo: ocrResult?.distToGo ?? [],
        programNumber: ocrResult?.programNumber ?? null,
        toolNumber: ocrResult?.toolNumber ?? null,
        cycleTime: ocrResult?.cycleTime ?? null,
        runTime: ocrResult?.runTime ?? null,
        programTime: ocrResult?.programTime ?? null,
        programRemainder: ocrResult?.programRemainder ?? null,
        programProgressPercent: ocrResult?.programProgressPercent ?? null,
        spindleSpeed: ocrResult?.spindleSpeed ?? null,
        spindleSpeedSet: ocrResult?.spindleSpeedSet ?? null,
        feedRate: ocrResult?.feedRate ?? null,
        machineMode: ocrResult?.machineMode ?? null,
        warnings: ocrResult?.warnings ?? null,
        displayReadable: ocrResult?.displayReadable ?? false,
      });
      setStep("done");
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
  };

  const steps = ["select", "capture", "processing", "review", "done"];
  const stepLabels = ["Machine", "Photo", "AI Analysis", "Review", "Done"];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Capture</h1>
        <p className="text-gray-500 mt-1">Take a photo — AI reads the CNC display and saves automatically</p>
      </div>

      <div className="max-w-2xl">

        {/* ── Global window status bar (visible on select + capture steps) ── */}
        {(step === "select" || step === "capture") && (
          <div className={`mb-4 rounded-xl border-2 p-3 flex items-center gap-3 ${
            windowOpen
              ? "bg-green-50 border-green-400"
              : "bg-gray-50 border-gray-200"
          }`}>
            {windowOpen ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-700">Capture window is OPEN</p>
                  <p className="text-xs text-green-600">Closes in <span className="font-mono font-bold">{fmt(timer.secs)}</span> — capture all machines now</p>
                </div>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600">Window closed</p>
                  <p className="text-xs text-gray-400">Next slot opens in <span className="font-mono font-bold text-gray-700">{fmt(timer.secs)}</span></p>
                </div>
              </>
            )}
          </div>
        )}

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

        {/* ── Step 1: Select Machine ── */}
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
                const slot = getCurrentSlot(m.id, productionEntries, intervalMin, windowMin);
                const statusLabel = slot?.status === "captured" ? " ✓" : slot?.status === "open" ? " 🟢" : "";
                return (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.type} ({op?.name ?? "Unassigned"}){statusLabel}
                  </option>
                );
              })}
            </select>

            {/* Machine info */}
            {machine && (
              <div className="p-4 bg-gray-50 rounded-lg text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-gray-500">Machine</span><span className="font-medium">{machine.name} ({machine.type})</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Operator</span><span className="font-medium">{operator?.name ?? "—"}</span></div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Slot</span>
                  <span className="font-medium">
                    {currentSlot ? `${currentSlot.label} – ${currentSlot.windowEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Captures this slot</span>
                  <span className="font-medium">{intervalCount}</span>
                </div>
              </div>
            )}

            {/* ── Per-machine block reason ── */}
            {selectedMachine && blockReason === "window_closed" && (
              <div className="flex items-start gap-3 p-4 bg-gray-100 border border-gray-300 rounded-xl">
                <Lock className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-gray-700">Capture window is closed</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    The next slot for <strong>{machine?.name}</strong> opens in{" "}
                    <span className="font-mono font-bold text-gray-800">{fmt(timer.secs)}</span>.
                    You can only capture during the {windowMin}-minute window.
                  </p>
                </div>
              </div>
            )}

            {selectedMachine && blockReason === "already_captured" && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-300 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-green-700">Already captured this slot</p>
                  <p className="text-sm text-green-600 mt-0.5">
                    <strong>{machine?.name}</strong> was captured at{" "}
                    <strong>{currentSlot?.capturedAt ? new Date(currentSlot.capturedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</strong>
                    {currentSlot?.partsCount != null && ` — ${currentSlot.partsCount} parts`}.
                    Next slot opens in <span className="font-mono font-bold">{fmt(timer.secs)}</span>.
                  </p>
                </div>
              </div>
            )}

            {selectedMachine && !blockReason && windowOpen && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-300 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping mt-2 shrink-0" />
                <div>
                  <p className="font-bold text-green-700">Window open — ready to capture</p>
                  <p className="text-sm text-green-600 mt-0.5">
                    Capture <strong>{machine?.name}</strong> now. Window closes in{" "}
                    <span className="font-mono font-bold">{fmt(timer.secs)}</span>.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleSelectMachine}
              disabled={!canProceed}
              className="w-full px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {!selectedMachine
                ? "Select a machine first"
                : blockReason === "window_closed"
                ? `Window closed — opens in ${fmt(timer.secs)}`
                : blockReason === "already_captured"
                ? "Already captured this slot"
                : "Start Capture Session"}
            </button>
          </div>
        )}

        {/* ── Step 2: Capture ── */}
        {step === "capture" && (
          <div className="space-y-4">
            {/* Live window countdown */}
            {windowOpen ? (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-amber-700 text-sm">Window closing in <span className="font-mono">{fmt(timer.secs)}</span></p>
                  <p className="text-xs text-amber-600">Capture before the window closes or this slot will be missed</p>
                </div>
              </div>
            ) : (
              // Window closed while user was on this step
              <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-red-700 text-sm">Window just closed — slot missed</p>
                  <p className="text-xs text-red-500">Next slot opens in <span className="font-mono font-bold">{fmt(timer.secs)}</span></p>
                </div>
                <button onClick={handleReset} className="shrink-0 text-xs text-red-600 underline">Go back</button>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Camera className="w-5 h-5 text-primary-600" />
                <span className="font-bold text-gray-900">Ready for capture</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Machine: <span className="font-semibold text-gray-900">{machine?.name}</span>
                <br />
                Operator: <span className="font-semibold text-gray-900">{operator?.name ?? "Unassigned"}</span>
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-bold text-gray-900">Capture CNC Display Photo</h3>
              <button
                type="button"
                onClick={() => windowOpen && cameraRef.current?.click()}
                disabled={!windowOpen}
                className="w-full border-2 border-dashed border-primary-300 bg-primary-50/40 rounded-xl p-8 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
              <button
                type="button"
                onClick={() => windowOpen && fileRef.current?.click()}
                disabled={!windowOpen}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" /> Upload from Gallery
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </div>
          </div>
        )}

        {/* ── Step 3: Processing ── */}
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

        {/* ── Step 4: Review & Save ── */}
        {step === "review" && ocrResult && (
          <div className="space-y-4">
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

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">AI Extracted Data</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  ocrResult.displayReadable ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                }`}>
                  {ocrResult.displayReadable ? "Display readable" : "Low readability"}
                </span>
              </div>

              {/* KPI boxes */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-xs font-medium text-blue-600 mb-1">Parts Made</p>
                  <p className="text-2xl font-bold text-blue-900">{ocrResult.partsCount ?? "—"}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                  <p className="text-xs font-medium text-purple-600 mb-1">Target</p>
                  <p className="text-2xl font-bold text-purple-900">{ocrResult.partGoal ?? "—"}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-xs font-medium text-green-600 mb-1">Pcs / Hour</p>
                  <p className="text-2xl font-bold text-green-900">
                    {ocrResult.cycleTimeSeconds && ocrResult.cycleTimeSeconds > 0
                      ? Math.round(3600 / ocrResult.cycleTimeSeconds) : "—"}
                  </p>
                </div>
              </div>

              {/* Work coordinates */}
              {ocrResult.axisPositions.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Work Coordinates</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ocrResult.axisPositions.map((pos) => (
                      <div key={pos.axis} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500 mb-0.5">{pos.axis}</p>
                        <p className="font-mono font-bold text-gray-900 text-sm">{pos.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Machine coordinates */}
              {ocrResult.machineCoordinates.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Machine Coordinates</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ocrResult.machineCoordinates.map((pos) => (
                      <div key={pos.axis} className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                        <p className="text-xs text-yellow-600 mb-0.5">{pos.axis}</p>
                        <p className="font-mono font-bold text-yellow-900 text-sm">{pos.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {ocrResult.programNumber && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                    <FileText className="w-3 h-3" />{ocrResult.programNumber}
                  </span>
                )}
                {ocrResult.toolNumber && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                    <Wrench className="w-3 h-3" />Tool: {ocrResult.toolNumber}
                  </span>
                )}
                {ocrResult.machineMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                    <Monitor className="w-3 h-3" />{ocrResult.machineMode}
                  </span>
                )}
                {ocrResult.cycleTimeSeconds != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                    <Timer className="w-3 h-3" />Cycle: {ocrResult.cycleTimeSeconds}s
                  </span>
                )}
                {ocrResult.spindleSpeed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium">
                    <Gauge className="w-3 h-3" />S: {ocrResult.spindleSpeed}
                  </span>
                )}
                {ocrResult.feedRate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">
                    <Zap className="w-3 h-3" />F: {ocrResult.feedRate}
                  </span>
                )}
                {ocrResult.programProgressPercent != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                    <Activity className="w-3 h-3" />Progress: {ocrResult.programProgressPercent}%
                  </span>
                )}
                {ocrResult.programRemainder && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    <Clock className="w-3 h-3" />Remaining: {ocrResult.programRemainder}
                  </span>
                )}
                {ocrResult.runTime && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    <Target className="w-3 h-3" />Runtime: {ocrResult.runTime}
                  </span>
                )}
              </div>

              {ocrResult.warnings && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm">
                  <AlertOctagon className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">Machine Warning</p>
                    <p className="text-red-600">{ocrResult.warnings}</p>
                  </div>
                </div>
              )}

              {ocrResult.confidenceNotes && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> View AI analysis notes
                  </summary>
                  <p className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-600">{ocrResult.confidenceNotes}</p>
                </details>
              )}
            </div>

            {selectedMachine && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {intervalCount} capture{intervalCount !== 1 ? "s" : ""} this interval
                  </p>
                  <p className="text-xs text-gray-500">{operator?.name} · last {intervalMin} min</p>
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
              onClick={() => setStep("capture")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Retake Photo
            </button>
          </div>
        )}

        {/* ── Step 5: Done ── */}
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
            {ocrResult?.partsCount != null && (
              <p className="text-2xl font-bold text-green-700 mb-4">{ocrResult.partsCount} parts recorded</p>
            )}
            <p className="text-sm text-gray-500 mb-6">
              {intervalCount} capture{intervalCount !== 1 ? "s" : ""} in the last {intervalMin} min
            </p>
            <button onClick={handleReset} className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
              <RotateCcw className="w-4 h-4" /> New Capture
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function emptyOcr() {
  return {
    rawText: "",
    partsCount: null as number | null,
    partGoal: null as number | null,
    cycleTimeSeconds: null as number | null,
    cycleTime: null as string | null,
    runTime: null as string | null,
    programTime: null as string | null,
    programRemainder: null as string | null,
    programProgressPercent: null as number | null,
    programNumber: null as string | null,
    toolNumber: null as string | null,
    machineMode: null as string | null,
    axisPositions: [] as { axis: string; value: string }[],
    machineCoordinates: [] as { axis: string; value: string }[],
    distToGo: [] as { axis: string; value: string }[],
    spindleSpeed: null as string | null,
    spindleSpeedSet: null as string | null,
    feedRate: null as string | null,
    warnings: null as string | null,
    displayReadable: false,
    confidence: 0,
    confidenceNotes: "Analysis failed",
  };
}
