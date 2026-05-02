import type { PersonalProgram } from "./types";

export const PERSONAL_PROGRAM_STORAGE_KEY = "nutrition.personalProgram";

export const PERSONAL_PROGRAM_EXPLANATION_STORAGE_KEY =
  "nutrition.personalProgramExplanation";

function isPersonalProgramShape(value: unknown): value is PersonalProgram {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.totalDays === "number" &&
    typeof v.startedAt === "string" &&
    v.nutritionRules !== null &&
    typeof v.nutritionRules === "object" &&
    Array.isArray(v.days)
  );
}

export function savePersonalProgram(program: PersonalProgram): void {
  localStorage.setItem(PERSONAL_PROGRAM_STORAGE_KEY, JSON.stringify(program));
}

export function loadPersonalProgram(): PersonalProgram | null {
  try {
    const raw = localStorage.getItem(PERSONAL_PROGRAM_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPersonalProgramShape(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPersonalProgram(): void {
  localStorage.removeItem(PERSONAL_PROGRAM_STORAGE_KEY);
}

export function savePersonalProgramExplanation(explanation: string): void {
  const trimmed = explanation.trim();
  if (!trimmed) {
    return;
  }
  localStorage.setItem(
    PERSONAL_PROGRAM_EXPLANATION_STORAGE_KEY,
    trimmed,
  );
}

export function loadPersonalProgramExplanation(): string | null {
  try {
    const raw = localStorage.getItem(PERSONAL_PROGRAM_EXPLANATION_STORAGE_KEY);
    if (raw == null) return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export function clearPersonalProgramExplanation(): void {
  localStorage.removeItem(PERSONAL_PROGRAM_EXPLANATION_STORAGE_KEY);
}
