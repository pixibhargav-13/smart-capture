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

Extract these fields (return null if not visible/readable):
- parts_count: The production/parts counter (number of pieces produced)
- program_number: The CNC program number (usually starts with O followed by digits)
- cycle_time: The cycle time shown on display
- axis_positions: Array of {axis, value} for ALL visible axis positions (e.g., X, Y, Z, C, B, U, V, or literally any other axis name shown on the display). Do not restrict to just X, Y, Z.
- spindle_speed: Spindle RPM if visible
- feed_rate: Feed rate if visible
- machine_mode: Operating mode (AUTO, MDI, JOG, etc.)
- any_warnings: Any error or warning messages visible on screen

IMPORTANT:
- If you cannot read a value clearly, return null for that field rather than guessing
- Be precise with numbers — production data accuracy is critical
- Look for the DIGITAL DISPLAY SCREEN, not physical labels on the machine body

Respond ONLY with valid JSON, no markdown, no explanation.`;

const USER_PROMPT = `Analyze this CNC machine display photo. Extract all production data visible on the screen.

Return JSON in this exact format:
{
  "parts_count": <number or null>,
  "program_number": <string or null>,
  "cycle_time": <string or null>,
  "axis_positions": [{"axis": "X", "value": "469.940"}, ...],
  "spindle_speed": <string or null>,
  "feed_rate": <string or null>,
  "machine_mode": <string or null>,
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

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("Analyze API error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
