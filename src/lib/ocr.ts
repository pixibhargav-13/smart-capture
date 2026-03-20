export interface OcrResult {
  rawText: string;
  partsCount: number | null;
  cycleTime: string | null;
  programNumber: string | null;
  axisPositions: { axis: string; value: string }[];
  confidence: number;
  // Extended fields from agentic AI
  spindleSpeed: string | null;
  feedRate: string | null;
  machineMode: string | null;
  warnings: string | null;
  displayReadable: boolean;
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
    partsCount: data.parts_count ?? null,
    cycleTime: data.cycle_time ?? null,
    programNumber: data.program_number ?? null,
    axisPositions: data.axis_positions ?? [],
    confidence: data.display_readable ? 95 : 40,
    spindleSpeed: data.spindle_speed ?? null,
    feedRate: data.feed_rate ?? null,
    machineMode: data.machine_mode ?? null,
    warnings: data.any_warnings ?? null,
    displayReadable: data.display_readable ?? false,
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
