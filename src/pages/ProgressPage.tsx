import type { PageProps } from "./pageProps";

const PROGRAM_SESSION_STORAGE_KEY = "nutrition.programSession";
const DAILY_ACTUALS_STORAGE_KEY = "nutrition.dailyActuals";

type DailyActual = {
  deviation: "same" | "less" | "more";
  notes: string;
  caloriesDelta: number;
  completedAt: string;
};

function readProgramSessionDayInfo(): { currentDay?: number; totalDays?: number } {
  try {
    const raw = localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const p = parsed as { currentDay?: unknown; totalDays?: unknown };
    return {
      currentDay:
        typeof p.currentDay === "number" && p.currentDay > 0
          ? Math.floor(p.currentDay)
          : undefined,
      totalDays:
        typeof p.totalDays === "number" && p.totalDays > 0
          ? Math.floor(p.totalDays)
          : undefined,
    };
  } catch {
    return {};
  }
}

function readDailyActuals(): Record<string, DailyActual> {
  try {
    const raw = localStorage.getItem(DAILY_ACTUALS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const result: Record<string, DailyActual> = {};
    for (const [day, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const entry = value as Partial<DailyActual>;
      if (
        (entry.deviation === "same" ||
          entry.deviation === "less" ||
          entry.deviation === "more") &&
        typeof entry.notes === "string" &&
        typeof entry.caloriesDelta === "number" &&
        typeof entry.completedAt === "string"
      ) {
        result[day] = {
          deviation: entry.deviation,
          notes: entry.notes,
          caloriesDelta: entry.caloriesDelta,
          completedAt: entry.completedAt,
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function ProgressPage({ mock: _mock }: PageProps) {
  const session = readProgramSessionDayInfo();
  const totalDays = session.totalDays ?? 14;
  const dailyActuals = readDailyActuals();
  const actualEntries = Object.values(dailyActuals);
  const completed = Object.keys(dailyActuals).length;
  const skipped = 0;
  const hasSkips = skipped > 0;
  const progressPercent = Math.round((completed / totalDays) * 100);
  const recordedDays = actualEntries.length;
  const totalCaloriesDelta = actualEntries.reduce(
    (sum, item) => sum + item.caloriesDelta,
    0,
  );
  const avgCaloriesDelta = recordedDays
    ? Math.round(totalCaloriesDelta / recordedDays)
    : 0;
  const sameDays = actualEntries.filter((item) => item.deviation === "same").length;
  const lessDays = actualEntries.filter((item) => item.deviation === "less").length;
  const moreDays = actualEntries.filter((item) => item.deviation === "more").length;
  const nutritionSummary =
    totalCaloriesDelta > 0
      ? "За записанные дни есть небольшой перевес по факту. Это не критично — продолжайте по плану, без компенсаций."
      : totalCaloriesDelta < 0
        ? "Есть недобор по факту. Важно не оставаться голодным и не пропускать основные приёмы пищи."
        : "В целом питание близко к плану.";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Прогресс</h1>
      <dl className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Процент программы</dt>
          <dd className="font-semibold">{progressPercent}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Выполнено дней</dt>
          <dd>{completed}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Пропущено дней</dt>
          <dd>{skipped}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-2">
          <dt className="text-slate-500">Серия выполнений</dt>
          <dd>{completed}</dd>
        </div>
      </dl>
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 className="text-sm font-semibold text-slate-900">Питание по факту</h2>
        <div className="flex justify-between">
          <span className="text-slate-500">Записано дней</span>
          <span>{recordedDays}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Условное отклонение</span>
          <span>{totalCaloriesDelta}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Среднее условное отклонение</span>
          <span>{avgCaloriesDelta}</span>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-2">
          <span className="text-slate-500">Дни: по плану / меньше / больше</span>
          <span>
            {sameDays} / {lessDays} / {moreDays}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Это не точный подсчёт калорий, а ориентир по вашей отметке и описанию
          дня.
        </p>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-700">{nutritionSummary}</p>
      </section>
      {hasSkips ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950">
          Пропуски случаются — главное, что вы снова в программе. Один шаг
          сегодня уже возвращает ритм без давления и вины.
        </p>
      ) : null}
    </div>
  );
}
