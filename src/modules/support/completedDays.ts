const DAILY_ACTUALS_STORAGE_KEY = "nutrition.dailyActuals";

type DailyDeviation = "same" | "less" | "more";

type DailyActualEntry = {
  deviation: DailyDeviation;
  notes: string;
  caloriesDelta: number;
  completedAt: string;
};

function isValidDailyActualEntry(entryUnknown: unknown): entryUnknown is DailyActualEntry {
  if (!entryUnknown || typeof entryUnknown !== "object") return false;
  const entry = entryUnknown as Partial<DailyActualEntry>;
  return (
    (entry.deviation === "same" ||
      entry.deviation === "less" ||
      entry.deviation === "more") &&
    typeof entry.notes === "string" &&
    typeof entry.caloriesDelta === "number" &&
    typeof entry.completedAt === "string"
  );
}

export function countCompletedDaysFromDailyActuals(): number {
  try {
    const raw = localStorage.getItem(DAILY_ACTUALS_STORAGE_KEY);
    if (!raw) return 0;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return 0;
    return Object.values(parsed as Record<string, unknown>).filter(isValidDailyActualEntry)
      .length;
  } catch {
    return 0;
  }
}
