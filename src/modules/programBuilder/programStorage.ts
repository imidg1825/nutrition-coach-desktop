import type { PersonalProgram } from "./types";

export const PERSONAL_PROGRAM_STORAGE_KEY = "nutrition.personalProgram";

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
