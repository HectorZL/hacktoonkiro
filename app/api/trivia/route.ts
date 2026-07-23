import { NextResponse } from "next/server";
import { fallbackTriviaQuestions, type TriviaQuestion } from "@/lib/competition/types";

export const dynamic = "force-dynamic";

const maximumQuestions = 40;

type TriviaRequest = {
  rounds?: unknown;
  players?: unknown;
  difficulty?: unknown;
  category?: unknown;
};

type JsonRecord = Record<string, unknown>;

function clampInteger(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

function createFallbackQuestions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...fallbackTriviaQuestions[index % fallbackTriviaQuestions.length],
    id: `fallback-${index + 1}`,
  }));
}

function readGeminiText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const candidates = (payload as JsonRecord).candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== "object") {
    return "";
  }
  const content = (candidates[0] as JsonRecord).content;
  if (!content || typeof content !== "object") {
    return "";
  }
  const parts = (content as JsonRecord).parts;
  if (!Array.isArray(parts)) {
    return "";
  }
  return parts
    .filter((part): part is JsonRecord => Boolean(part && typeof part === "object"))
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
}

function parseJsonText(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1)) as unknown;
      } catch {
        return null;
      }
    }
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      try {
        return JSON.parse(cleaned.slice(objectStart, objectEnd + 1)) as unknown;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeQuestions(value: unknown): TriviaQuestion[] {
  let rawQuestions: unknown[] = [];
  if (Array.isArray(value)) {
    rawQuestions = value;
  } else if (value && typeof value === "object") {
    const nestedQuestions = (value as JsonRecord).questions;
    if (Array.isArray(nestedQuestions)) {
      rawQuestions = nestedQuestions;
    }
  }

  return rawQuestions.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== "object") {
      return [];
    }

    const record = candidate as JsonRecord;
    const question = typeof record.question === "string" ? record.question.trim() : "";
    const options = Array.isArray(record.options)
      ? record.options.filter((option): option is string => typeof option === "string").map((option) => option.trim())
      : [];
    const correctOption = Number(record.correctOption);
    const category = typeof record.category === "string" ? record.category.trim() : "Ecuador";
    const explanation = typeof record.explanation === "string" ? record.explanation.trim() : undefined;

    if (
      question.length < 10 ||
      options.length !== 4 ||
      options.some((option) => option.length === 0) ||
      !Number.isInteger(correctOption) ||
      correctOption < 0 ||
      correctOption > 3
    ) {
      return [];
    }

    return [
      {
        id: `gemini-${index + 1}`,
        question,
        options,
        correctOption,
        category: category || "Ecuador",
        explanation,
      },
    ];
  });
}

function completeQuestions(questions: TriviaQuestion[], count: number) {
  const completed = [...questions];
  let fallbackIndex = 0;
  while (completed.length < count) {
    const fallback = fallbackTriviaQuestions[fallbackIndex % fallbackTriviaQuestions.length];
    completed.push({ ...fallback, id: `fallback-${completed.length + 1}` });
    fallbackIndex += 1;
  }
  return completed.slice(0, count);
}

export async function POST(request: Request) {
  let body: TriviaRequest = {};
  try {
    body = (await request.json()) as TriviaRequest;
  } catch {
    body = {};
  }

  const rounds = clampInteger(body.rounds, 5, 1, 20);
  const players = clampInteger(body.players, 2, 2, 8);
  const count = Math.min(maximumQuestions, Math.max(4, rounds * players));
  const difficulty = typeof body.difficulty === "string" ? body.difficulty.slice(0, 40) : "intermedia";
  const category = typeof body.category === "string" ? body.category.slice(0, 80) : "variada de Ecuador";
  const fallback = createFallbackQuestions(count);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      questions: fallback,
      source: "fallback",
      notice: "La trivia usa preguntas locales porque Gemini todavía no está configurado.",
    });
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const prompt = `
Genera ${count} preguntas de trivia en español sobre Ecuador para personas adultas mayores.
Tema: ${category}.
Dificultad: ${difficulty}.
Las preguntas deben ser amables, claras, culturalmente respetuosas y basadas en hechos conocidos.
Incluye historia, geografía, naturaleza, gastronomía, música, tradiciones y lugares del Ecuador cuando corresponda.
No incluyas temas médicos, diagnósticos, política partidista, violencia ni datos personales.
Cada pregunta debe tener exactamente cuatro opciones y una sola respuesta correcta.
Devuelve únicamente un arreglo JSON válido, sin Markdown, con esta forma:
[
  {
    "question": "Pregunta",
    "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
    "correctOption": 0,
    "category": "Geografía",
    "explanation": "Explicación breve"
  }
]
correctOption debe ser un índice numérico de cero a tres.
`.trim();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error("Gemini no devolvió una respuesta válida.");
    }

    const payload = (await response.json()) as unknown;
    const generatedQuestions = normalizeQuestions(parseJsonText(readGeminiText(payload)));
    if (generatedQuestions.length === 0) {
      throw new Error("Gemini no generó preguntas con el formato esperado.");
    }

    return NextResponse.json({
      questions: completeQuestions(generatedQuestions, count),
      source: "gemini",
    });
  } catch {
    return NextResponse.json({
      questions: fallback,
      source: "fallback",
      notice: "No se pudo generar la trivia en este momento; se usan preguntas locales.",
    });
  }
}
