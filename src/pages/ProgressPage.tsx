import {
  questionnaireDefaults,
  type ClientQuestionnaire,
} from "../modules/questionnaire";
import { buildPersonalProgram } from "../modules/programBuilder";
import type { PageProps } from "./pageProps";

const DAILY_ACTUALS_STORAGE_KEY = "nutrition.dailyActuals";
const PROGRAM_CONFIG_STORAGE_KEY = "nutrition.programConfig";

type DailyActual = {
  deviation: "same" | "less" | "more";
  notes: string;
  caloriesDelta: number;
  completedAt: string;
};

function readProgramDuration(): 7 | 14 | 30 {
  const programConfigRaw = localStorage.getItem(PROGRAM_CONFIG_STORAGE_KEY);
  let duration: 7 | 14 | 30 = 14;
  try {
    const parsed = programConfigRaw ? JSON.parse(programConfigRaw) : null;
    if (
      parsed?.duration === 7 ||
      parsed?.duration === 14 ||
      parsed?.duration === 30
    ) {
      duration = parsed.duration;
    }
  } catch (_e) {
    // fallback 14
  }
  return duration;
}

function mergeQuestionnaireFromProfile(seed: unknown): ClientQuestionnaire {
  const q =
    seed && typeof seed === "object" && "questionnaire" in seed
      ? (seed as { questionnaire?: Partial<ClientQuestionnaire> }).questionnaire
      : undefined;
  return {
    basics: { ...questionnaireDefaults.basics, ...q?.basics },
    goalAndDuration: {
      ...questionnaireDefaults.goalAndDuration,
      ...q?.goalAndDuration,
    },
    medicalParticularities: {
      ...questionnaireDefaults.medicalParticularities,
      ...q?.medicalParticularities,
    },
    dayScheduleAndWork: {
      ...questionnaireDefaults.dayScheduleAndWork,
      ...q?.dayScheduleAndWork,
    },
    foodAndProducts: {
      ...questionnaireDefaults.foodAndProducts,
      ...q?.foodAndProducts,
    },
    budgetSeasonAndAvailability: {
      ...questionnaireDefaults.budgetSeasonAndAvailability,
      ...q?.budgetSeasonAndAvailability,
    },
    habitsDifficultiesAndSupport: {
      ...questionnaireDefaults.habitsDifficultiesAndSupport,
      ...q?.habitsDifficultiesAndSupport,
    },
    cookingHabitsAndMethods: q?.cookingHabitsAndMethods
      ? {
          ...questionnaireDefaults.cookingHabitsAndMethods,
          ...q.cookingHabitsAndMethods,
        }
      : undefined,
    healthAndAnalyses: {
      ...questionnaireDefaults.healthAndAnalyses,
      ...q?.healthAndAnalyses,
    },
  };
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

export function ProgressPage({ mock }: PageProps) {
  const q = mergeQuestionnaireFromProfile(mock.user.profile);
  const duration = readProgramDuration();
  const personalProgram = buildPersonalProgram(q, { duration });
  const totalDays = personalProgram.totalDays || personalProgram.days.length;
  const dailyActuals = readDailyActuals();
  const actualEntries = Object.values(dailyActuals);
  const completed = Object.keys(dailyActuals).length;
  const skipped = 0;
  const hasSkips = skipped > 0;
  const progressPercent = totalDays
    ? Math.round((completed / totalDays) * 100)
    : 0;
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
  const chartData = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const entry = dailyActuals[String(day)];
    return {
      day,
      delta: entry?.caloriesDelta ?? 0,
    };
  });
  const maxAbsDelta = Math.max(
    1,
    ...chartData.map((item) => Math.abs(item.delta)),
  );
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
        <h2 className="text-sm font-semibold text-slate-900">
          Как менялось питание по дням
        </h2>
        <div className="flex h-28 items-stretch gap-1 overflow-x-auto rounded-md bg-slate-50 p-2">
          {chartData.map((item) => {
            const normalizedHeight = Math.max(
              4,
              Math.round((Math.abs(item.delta) / maxAbsDelta) * 48),
            );
            const barColor =
              item.delta > 0
                ? "bg-amber-400"
                : item.delta < 0
                  ? "bg-sky-500"
                  : "bg-slate-300";
            return (
              <div
                key={item.day}
                className="relative h-full min-w-2 flex-1 rounded-sm"
                title={`День ${item.day}: ${item.delta}`}
              >
                <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-200" />
                {item.delta === 0 ? (
                  <div className={`absolute left-0 right-0 top-[calc(50%-2px)] h-1 ${barColor}`} />
                ) : item.delta > 0 ? (
                  <div
                    className={`absolute bottom-1/2 left-0 right-0 rounded-t-sm ${barColor}`}
                    style={{ height: `${normalizedHeight}px` }}
                  />
                ) : (
                  <div
                    className={`absolute left-0 right-0 top-1/2 rounded-b-sm ${barColor}`}
                    style={{ height: `${normalizedHeight}px` }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          Это не точный подсчёт калорий, а ориентир по вашим отметкам и описанию
          дней.
        </p>
      </section>
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
