import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a CNC machine display data extraction agent. You receive photos of CNC machine control panels/displays taken by factory employees on mobile phones.

Your job:
1. FIND the screen/display area in the photo (it may be at an angle, have glare, or be partially obscured)
2. READ all data visible on the display
3. EXTRACT structured production data

The photos may be:
- Taken at angles
- Blurry or low quality
- Have screen glare or reflections
- Show the full machine panel (you need to focus on the digital display)

Different CNC controller brands (Siemens, Fanuc, Mitsubishi, HaOre/HCNC, 990TDc, etc.) show data differently. Understand the context.

Extract ALL of these fields (return null if not visible/readable):

PRODUCTION COUNTERS:
- parts_count: The parts/workpieces produced counter. Look for: "PartNo", "Workpieces actual", "PartCnt", "Parts counter", "ACT PARTS", "TOTAL PARTS". This is the cumulative count.
- part_goal: Target/setpoint parts. Look for: "PartGoal", "Workpieces, setpoint", "TARGET", "GOAL". Return as number.

TIMING:
- cycle_time_seconds: Time per part in SECONDS (integer). Look for: "PartTime" (e.g. "0:55" = 55s, "1:23" = 83s), "CycTime" (e.g. 59.9 = 60s), "Cycle time". Convert to total seconds.
- run_time: Total machine runtime string. Look for: "RunTime", "Operating time", "TOTAL TIME". Return as string e.g. "5280:33:24".
- program_time: Current program elapsed time. Return as string.
- program_remainder: Estimated remaining time. Look for "Prog. remainder". Return as string.
- program_progress_percent: Program completion %. Return as number 0-100.

PROGRAM & TOOL:
- program_number: CNC program number/name. Look for "Program", "O0093", "NC/MPF/...", program filename.
- tool_number: Active tool. Look for "T0101", "T:", "VCGT FINISH", tool designation.
- machine_mode: Operating mode. Look for "AUTO", "MDI", "JOG", "MEM", "AutoCon Run", "AutoCon Stop".

MOTION:
- axis_positions: Array of {axis, value} for ALL work coordinate axis positions (X, Z, Y, A, B, C, etc. in the main large position display area).
- machine_coordinates: Array of {axis, value} for machine/absolute coordinates. Look for "MachCoor", "Machine Coor", "Abs.Coor" section. Different from work coordinates.
- dist_to_go: Array of {axis, value} for remaining distance. Look for "Dist-to-go".

SPINDLE & FEED:
- spindle_speed: Actual spindle RPM. Look for "S1", "SRpm", "Actual RPM", "SACT".
- spindle_speed_set: Commanded spindle speed (setpoint).
- feed_rate: Actual feed rate. Look for "F", "TrueFeed", "FACT".

ALARMS:
- any_warnings: Any alarm/error/warning text visible. "No Alarm" means null.

IMPORTANT:
- parts_count is the most critical field — search carefully for any counter showing produced parts
- cycle_time_seconds must be a number in seconds, not a string — convert "0:55" → 55, "1:23" → 83, "59.9" → 60
- If you cannot read a value clearly, return null rather than guessing
- Look for the DIGITAL DISPLAY SCREEN, not physical labels on the machine body

Respond ONLY with valid JSON, no markdown, no explanation.`;

const USER_PROMPT = `Analyze this CNC machine display photo. Extract ALL production data visible on the screen.

Return JSON in this exact format:
{
  "parts_count": <number or null>,
  "part_goal": <number or null>,
  "cycle_time_seconds": <number in seconds or null>,
  "run_time": <string or null>,
  "program_time": <string or null>,
  "program_remainder": <string or null>,
  "program_progress_percent": <number 0-100 or null>,
  "program_number": <string or null>,
  "tool_number": <string or null>,
  "machine_mode": <string or null>,
  "axis_positions": [{"axis": "X", "value": "469.940"}, ...],
  "machine_coordinates": [{"axis": "X", "value": "-26.100"}, ...],
  "dist_to_go": [{"axis": "X", "value": "121.002"}, ...],
  "spindle_speed": <string or null>,
  "spindle_speed_set": <string or null>,
  "feed_rate": <string or null>,
  "any_warnings": <string or null>,
  "display_readable": <boolean>,
  "confidence_notes": <string explaining what you could/couldn't read>
}`;

export async function POST(request: NextRequest) {
  try {
    const { image, mimeType } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Strip the data:image/... prefix if present
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const mediaType = mimeType || "image/png";

    const response = await fetch(
      "https://models.inference.ai.azure.com/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mediaType};base64,${base64Data}`,
                    detail: "high",
                  },
                },
                {
                  type: "text",
                  text: USER_PROMPT,
                },
              ],
            },
          ],
          max_tokens: 1024,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("GitHub Models error:", errText);
      return NextResponse.json(
        { error: `GitHub Models API error: ${response.status} - ${errText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    // Parse the JSON response
    let parsed;
    try {
      let jsonStr = text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({
        raw: text,
        error: "Failed to parse structured data",
        parts_count: null,
      });
    }

    // Normalize cycle_time_seconds — accept legacy "cycle_time" string as fallback
    if (parsed.cycle_time_seconds == null && parsed.cycle_time) {
      const parts = String(parsed.cycle_time).split(":");
      if (parts.length === 2) {
        const secs = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
        if (!isNaN(secs)) parsed.cycle_time_seconds = Math.round(secs);
      } else if (parts.length === 1) {
        const v = parseFloat(parts[0]);
        if (!isNaN(v)) parsed.cycle_time_seconds = Math.round(v);
      }
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("Analyze API error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
