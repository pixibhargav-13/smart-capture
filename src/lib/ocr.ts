export interface OcrResult {
  rawText: string;
  // Production counters
  partsCount: number | null;
  partGoal: number | null;
  // Timing
  cycleTimeSeconds: number | null;   // seconds per part — key for pcs/hour
  cycleTime: string | null;          // raw string from display (legacy / display use)
  runTime: string | null;
  programTime: string | null;
  programRemainder: string | null;
  programProgressPercent: number | null;
  // Program & tool
  programNumber: string | null;
  toolNumber: string | null;
  machineMode: string | null;
  // Motion
  axisPositions: { axis: string; value: string }[];
  machineCoordinates: { axis: string; value: string }[];
  distToGo: { axis: string; value: string }[];
  // Spindle & feed
  spindleSpeed: string | null;
  spindleSpeedSet: string | null;
  feedRate: string | null;
  // Status
  warnings: string | null;
  displayReadable: boolean;
  confidence: number;
  confidenceNotes: string;
}

/**
 * Extract data from a CNC machine display photo using Claude Vision API.
 * Sends the image to our API route which uses Claude to:
 * 1. Detect the screen area in the photo
 * 2. Read all display data intelligently
 * 3. Return structured production data
 */
export async function extractCncData(
  imageSource: string | File,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  onProgress?.(10);

  // Convert File to base64 if needed
  let base64Image: string;
  let mimeType = "image/png";

  if (imageSource instanceof File) {
    mimeType = imageSource.type || "image/png";
    base64Image = await fileToBase64(imageSource);
  } else {
    base64Image = imageSource;
  }

  onProgress?.(30);

  // Call our API route
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Image, mimeType }),
  });

  onProgress?.(80);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `API error: ${response.status}`);
  }

  const data = await response.json();

  onProgress?.(100);

  return {
    rawText: data.confidence_notes || data.raw || "",
    // Production counters
    partsCount: data.parts_count ?? null,
    partGoal: data.part_goal ?? null,
    // Timing
    cycleTimeSeconds: data.cycle_time_seconds ?? null,
    cycleTime: data.cycle_time_seconds != null ? `${data.cycle_time_seconds}s` : (data.cycle_time ?? null),
    runTime: data.run_time ?? null,
    programTime: data.program_time ?? null,
    programRemainder: data.program_remainder ?? null,
    programProgressPercent: data.program_progress_percent ?? null,
    // Program & tool
    programNumber: data.program_number ?? null,
    toolNumber: data.tool_number ?? null,
    machineMode: data.machine_mode ?? null,
    // Motion
    axisPositions: data.axis_positions ?? [],
    machineCoordinates: data.machine_coordinates ?? [],
    distToGo: data.dist_to_go ?? [],
    // Spindle & feed
    spindleSpeed: data.spindle_speed ?? null,
    spindleSpeedSet: data.spindle_speed_set ?? null,
    feedRate: data.feed_rate ?? null,
    // Status
    warnings: data.any_warnings ?? null,
    displayReadable: data.display_readable ?? false,
    confidence: data.display_readable ? 95 : 40,
    confidenceNotes: data.confidence_notes ?? "",
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
