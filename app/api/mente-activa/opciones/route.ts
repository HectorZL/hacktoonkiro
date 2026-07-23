import { NextResponse } from "next/server";

const allowedAreas = ["Atención sostenida", "Memoria de trabajo", "Memoria episódica", "Orientación"] as const;
type Area = (typeof allowedAreas)[number];
type GeneratedExercise = {
  title: string;
  prompt: string;
  options: [string, string, string];
  correctOption: number;
  hint: string;
  icon: string;
};

function isGeneratedExercise(value: unknown): value is GeneratedExercise {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.prompt === "string" &&
    Array.isArray(candidate.options) &&
    candidate.options.length === 3 &&
    candidate.options.every((option) => typeof option === "string") &&
    Number.isInteger(candidate.correctOption) &&
    typeof candidate.correctOption === "number" &&
    candidate.correctOption >= 0 &&
    candidate.correctOption <= 2 &&
    typeof candidate.hint === "string" &&
    typeof candidate.icon === "string"
  );
}

function extractJson(text: string) {
  return text.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ available: false, reason: "Gemini no está configurado." }, { status: 503 });
  }

  let area: Area;
  try {
    const payload = (await request.json()) as { area?: unknown };
    if (!allowedAreas.includes(payload.area as Area)) {
      return NextResponse.json({ error: "Área de práctica no válida." }, { status: 400 });
    }
    area = payload.area as Area;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
  const prompt = `Genera un único ejercicio recreativo de estimulación cognitiva en español para una persona mayor. Área: ${area}. No diagnostiques, no menciones enfermedades, no uses datos personales, ni contenido triste o infantil. Usa lenguaje breve, amable y claro. Devuelve exclusivamente JSON válido con: title (texto), prompt (texto), options (exactamente tres respuestas cortas), correctOption (0, 1 o 2), hint (texto breve), icon (un emoji).`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.5, maxOutputTokens: 400 },
        }),
      },
    );
    if (!response.ok) {
      return NextResponse.json({ available: false, reason: "Gemini no pudo generar un ejercicio." }, { status: 502 });
    }

    const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ available: false, reason: "Gemini no devolvió contenido utilizable." }, { status: 502 });
    }
    const exercise = JSON.parse(extractJson(text)) as unknown;
    if (!isGeneratedExercise(exercise)) {
      return NextResponse.json({ available: false, reason: "La respuesta de Gemini no pasó la validación." }, { status: 502 });
    }
    return NextResponse.json({ available: true, exercise });
  } catch {
    return NextResponse.json({ available: false, reason: "No fue posible conectar con Gemini." }, { status: 502 });
  }
}
