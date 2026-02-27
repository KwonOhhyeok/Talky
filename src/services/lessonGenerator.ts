import { DEFAULT_LESSON_MATERIAL } from "../config/systemPrompt";

const LESSON_GENERATE_TIMEOUT_MS = 15000;

type GenerateLessonResponse = {
  lessonMaterial?: unknown;
  error?: unknown;
};

function normalizeLessonMaterial(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function generateLesson(
  interest: string,
  options: { apiBase?: string } = {}
): Promise<string> {
  const topic = interest.trim();
  if (!topic) return DEFAULT_LESSON_MATERIAL;

  const endpoint = `${options.apiBase ?? ""}/api/generate-lesson`;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), LESSON_GENERATE_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interest: topic }),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(
        `Lesson generation failed (${response.status}): ${bodyText || "empty response"}`
      );
    }

    const payload = (await response.json()) as GenerateLessonResponse;
    console.log("[LessonGenerator] /api/generate-lesson response", payload);
    const lessonMaterial = normalizeLessonMaterial(payload.lessonMaterial);
    if (!lessonMaterial) {
      throw new Error("Lesson generation failed: empty lessonMaterial in response");
    }
    return lessonMaterial;
  } catch (err) {
    console.error("[LessonGenerator] generateLesson failed", err);
    return DEFAULT_LESSON_MATERIAL;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
