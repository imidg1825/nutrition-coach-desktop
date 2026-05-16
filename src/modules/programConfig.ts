/** Выбранная длительность программы на стартовом экране. */
export type ProgramDuration = 7 | 14 | 30;

export const PROGRAM_CONFIG_STORAGE_KEY = "nutrition.programConfig";

const DEFAULT_DURATION: ProgramDuration = 14;

function isProgramDuration(value: unknown): value is ProgramDuration {
  return value === 7 || value === 14 || value === 30;
}

/** Читает duration из nutrition.programConfig. */
export function readProgramDuration(): ProgramDuration {
  try {
    const raw = localStorage.getItem(PROGRAM_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_DURATION;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "duration" in parsed &&
      isProgramDuration((parsed as { duration: unknown }).duration)
    ) {
      return (parsed as { duration: ProgramDuration }).duration;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_DURATION;
}

/** Сохраняет duration в nutrition.programConfig. */
export function writeProgramDuration(duration: ProgramDuration): void {
  localStorage.setItem(
    PROGRAM_CONFIG_STORAGE_KEY,
    JSON.stringify({ duration }),
  );
}
