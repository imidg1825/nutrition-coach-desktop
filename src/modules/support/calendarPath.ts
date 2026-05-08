export function dateOnlyFromIsoDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Календарный индекс дня программы от startedAt.
 *
 * - startedAt: YYYY-MM-DD
 * - сравнение по датам (без часов)
 * - результат минимум 1
 * - при невалидной дате — fallback 1
 */
export function calendarDayIndexFromStartedAt(
  startedAt: string,
  now: Date = new Date(),
): number {
  const startDate = dateOnlyFromIsoDate(startedAt);
  if (!startDate) return 1;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - startDate.getTime();
  const dayIndex = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, dayIndex);
}

