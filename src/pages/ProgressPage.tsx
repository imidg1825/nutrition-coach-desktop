import { useEffect, useState } from "react";
import {
  questionnaireDefaults,
  type ClientQuestionnaire,
} from "../modules/questionnaire";
import {
  getPersonalProgram,
  type PersonalProgram,
} from "../modules/programBuilder";
import { estimateCalories } from "../modules/calories/calorieEstimator";
import {
  calendarDayIndexFromStartedAt,
  dateOnlyFromIsoDate,
} from "../modules/support/calendarPath";
import type { PageProps } from "./pageProps";

const DAILY_ACTUALS_STORAGE_KEY = "nutrition.dailyActuals";
const PROGRAM_CONFIG_STORAGE_KEY = "nutrition.programConfig";
const PROGRAM_SESSION_STORAGE_KEY = "nutrition.programSession";

type DailyActual = {
  deviation: "same" | "less" | "more";
  notes: string;
  caloriesDelta: number;
  completedAt: string;
};

type CalendarRhythmStatus = "done" | "pause" | "today";

type CalendarRhythmItem = {
  dateIso: string;
  labelTop: string;
  labelBottom: string;
  status: CalendarRhythmStatus;
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

function readProgramStartedAtFromSession(): string | null {
  try {
    const raw = localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as { startedAt?: unknown };
    return typeof p.startedAt === "string" && p.startedAt.trim().length > 0
      ? p.startedAt
      : null;
  } catch {
    return null;
  }
}

function localDateIso(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysIso(isoDate: string, days: number): string | null {
  const base = dateOnlyFromIsoDate(isoDate);
  if (!base) return null;
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return localDateIso(next);
}

function formatDayMonthRu(isoDate: string): string {
  const dt = dateOnlyFromIsoDate(isoDate);
  if (!dt) return isoDate;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(dt);
}

function completionDateIsoFromCompletedAt(completedAt: string): string | null {
  const parsed = new Date(completedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return localDateIso(parsed);
}

function buildCalendarRhythmItems(params: {
  startedAt: string;
  totalDays: number;
  completedDayNumbers: Set<number>;
  dailyActuals: Record<string, DailyActual>;
  now?: Date;
}): CalendarRhythmItem[] {
  const now = params.now ?? new Date();
  const calendarDayIndex = calendarDayIndexFromStartedAt(params.startedAt, now);
  const todayIso = localDateIso(now);
  const todayLabel = `Сегодня, ${formatDayMonthRu(todayIso)}`;

  const completedDaysCount = params.completedDayNumbers.size;
  const nextActionDay = Math.min(completedDaysCount + 1, params.totalDays);

  if (completedDaysCount === 0) {
    return [
      {
        dateIso: todayIso,
        status: "today",
        labelTop: `${todayLabel} · День 1`,
        labelBottom: "Начинаем спокойно — Олеся рядом",
      },
    ];
  }

  const completedByDate = new Map<string, number[]>();
  for (const [dayStr, entry] of Object.entries(params.dailyActuals)) {
    const dayNumber = parseInt(dayStr, 10);
    if (!Number.isFinite(dayNumber) || dayNumber <= 0) continue;
    const dateIso = completionDateIsoFromCompletedAt(entry.completedAt);
    if (!dateIso) continue;
    const list = completedByDate.get(dateIso) ?? [];
    list.push(dayNumber);
    completedByDate.set(dateIso, list);
  }
  for (const list of completedByDate.values()) {
    list.sort((a, b) => a - b);
  }

  const items: CalendarRhythmItem[] = [];
  for (let i = 0; i < calendarDayIndex; i += 1) {
    const dateIso = addDaysIso(params.startedAt, i);
    if (!dateIso) break;

    const isToday = dateIso === todayIso;
    const dateLabel = formatDayMonthRu(dateIso);

    if (isToday) {
      const completedToday = completedByDate.get(dateIso);
      if (completedToday && completedToday.length > 0) {
        const dayPart =
          completedToday.length === 1
            ? `День ${completedToday[0]}`
            : `Дни ${completedToday.join(", ")}`;
        items.push({
          dateIso,
          status: "today",
          labelTop: `${todayLabel} · ${dayPart}`,
          labelBottom: "Получилось",
        });
        continue;
      }
      items.push({
        dateIso,
        status: "today",
        labelTop: `${todayLabel} · День ${nextActionDay}`,
        labelBottom: "Продолжаем спокойно",
      });
      continue;
    }

    const completedDays = completedByDate.get(dateIso);
    if (completedDays && completedDays.length > 0) {
      const dayPart =
        completedDays.length === 1
          ? `День ${completedDays[0]}`
          : `Дни ${completedDays.join(", ")}`;
      items.push({
        dateIso,
        status: "done",
        labelTop: `${dateLabel} · ${dayPart}`,
        labelBottom: "Получилось",
      });
      continue;
    }

    items.push({
      dateIso,
      status: "pause",
      labelTop: dateLabel,
      labelBottom: "Пауза — это не сброс",
    });
  }

  return items;
}

function countCompletionStreakFromStart(dailyActuals: Record<string, DailyActual>): number {
  let streak = 0;
  while (dailyActuals[String(streak + 1)]) {
    streak += 1;
  }
  return streak;
}

/** Тексты приёмов пищи из заметок дня (формат DayPage) или весь текст, если меток нет. */
function mealTextFromNotes(notes: string): string {
  const raw = notes.trim();
  if (!raw) return "";
  const lines = raw.split(/\r?\n/);
  const collected: string[] = [];
  const labels = ["завтрак:", "обед:", "перекусы:", "ужин:"];
  for (const line of lines) {
    const t = line.trim();
    const low = t.toLowerCase();
    for (const lab of labels) {
      if (low.startsWith(lab)) {
        const colon = t.indexOf(":");
        const rest = colon >= 0 ? t.slice(colon + 1).trim() : "";
        if (rest) collected.push(rest);
        break;
      }
    }
  }
  if (collected.length > 0) return collected.join(" ");
  return raw;
}

/** Средняя «плотность» описаний: порог ориентира (не медицина). */
const ORIENT_HIGH_MIDPOINT = 850;

type NutritionOrientState =
  | { phase: "loading" }
  | { phase: "sparse" }
  | { phase: "ready"; avgMin: number; avgMax: number; tone: "high" | "normal" };

export function ProgressPage({
  mock,
  clientQuestionnaire,
}: PageProps & { clientQuestionnaire: ClientQuestionnaire | null }) {
  const q = clientQuestionnaire ?? mergeQuestionnaireFromProfile(mock.user.profile);
  const duration = readProgramDuration();
  const [personalProgram, setPersonalProgram] = useState<PersonalProgram | null>(
    null,
  );
  const dailyActualsSnapshot = readDailyActuals();
  const dailyActualsFingerprint = JSON.stringify(dailyActualsSnapshot);
  const [nutritionOrient, setNutritionOrient] =
    useState<NutritionOrientState>({ phase: "loading" });

  useEffect(() => {
    let mounted = true;

    getPersonalProgram(q, { duration }).then((program) => {
      if (mounted) {
        setPersonalProgram(program);
      }
    });

    return () => {
      mounted = false;
    };
  }, [q, duration]);

  useEffect(() => {
    if (personalProgram === null) return;

    let cancelled = false;
    setNutritionOrient({ phase: "loading" });

    void (async () => {
      try {
        const actuals = dailyActualsSnapshot;
        const entries = Object.values(actuals);
        if (entries.length === 0) {
          if (!cancelled) setNutritionOrient({ phase: "sparse" });
          return;
        }

        const dayEstimates: { min: number; max: number }[] = [];

        for (const entry of entries) {
          const meal = mealTextFromNotes(entry.notes);
          if (!meal.trim()) continue;
          const est = await estimateCalories(meal);
          if (
            est.caloriesMin <= 0 &&
            est.caloriesMax <= 0 &&
            est.foundProducts.length === 0
          ) {
            continue;
          }
          dayEstimates.push({
            min: est.caloriesMin,
            max: est.caloriesMax,
          });
        }

        if (cancelled) return;

        if (dayEstimates.length < 2) {
          setNutritionOrient({ phase: "sparse" });
          return;
        }

        const n = dayEstimates.length;
        const avgMin = Math.round(
          dayEstimates.reduce((s, e) => s + e.min, 0) / n,
        );
        const avgMax = Math.round(
          dayEstimates.reduce((s, e) => s + e.max, 0) / n,
        );
        const mid = (avgMin + avgMax) / 2;
        const tone =
          mid >= ORIENT_HIGH_MIDPOINT ? ("high" as const) : ("normal" as const);

        setNutritionOrient({
          phase: "ready",
          avgMin,
          avgMax,
          tone,
        });
      } catch {
        if (!cancelled) setNutritionOrient({ phase: "sparse" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [personalProgram, dailyActualsFingerprint]);

  if (personalProgram === null) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Олеся собирает программу под вашу анкету, ограничения и привычки...
      </div>
    );
  }

  const totalDays = personalProgram.totalDays || personalProgram.days.length;
  const dailyActuals = dailyActualsSnapshot;
  const actualEntries = Object.values(dailyActuals);
  const completedDayNumbers = new Set(
    Object.keys(dailyActuals)
      .map((k) => parseInt(k, 10))
      .filter((n) => Number.isFinite(n) && n > 0),
  );
  const completed = Object.keys(dailyActuals).length;
  const streak = countCompletionStreakFromStart(dailyActuals);
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

  const startedAt = readProgramStartedAtFromSession();
  const calendarDayIndex =
    startedAt && startedAt.trim().length > 0
      ? calendarDayIndexFromStartedAt(startedAt)
      : null;
  const pauses =
    calendarDayIndex && completed > 0 ? Math.max(0, calendarDayIndex - completed) : 0;
  const rhythmItems =
    startedAt && startedAt.trim().length > 0
      ? buildCalendarRhythmItems({
          startedAt,
          totalDays,
          completedDayNumbers,
          dailyActuals,
        })
      : [];

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
        {completed > 0 && pauses > 0 ? (
          <div className="flex justify-between">
            <dt className="text-slate-500">Паузы</dt>
            <dd>{pauses}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-slate-100 pt-2">
          <dt className="text-slate-500">Серия выполнений</dt>
          <dd>{streak}</dd>
        </div>
      </dl>
      <section className="space-y-3 rounded-lg border border-teal-100 bg-gradient-to-b from-amber-50/60 to-teal-50/40 p-4 text-sm leading-relaxed text-slate-800">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-900">Где мы сейчас</h2>
          <p className="text-xs text-slate-600">
            Это не отчёт и не оценка — просто мягкая точка опоры на сегодня.
          </p>
        </div>
        {startedAt === null ? (
          <p className="text-slate-700">
            Ритм появится после старта программы.
          </p>
        ) : rhythmItems.length === 0 ? (
          <p className="text-slate-700">Пока нет данных, чтобы показать ритм.</p>
        ) : (
          <div className="space-y-2">
            {rhythmItems.map((item) => {
              const styles =
                item.status === "done"
                  ? "bg-emerald-50/80 ring-1 ring-emerald-100 text-emerald-950"
                  : item.status === "today"
                    ? "bg-teal-50/80 ring-1 ring-teal-100 text-teal-950"
                    : "bg-amber-50/80 ring-1 ring-amber-100 text-amber-950";
              const dot =
                item.status === "done"
                  ? "bg-emerald-400"
                  : item.status === "today"
                    ? "bg-teal-400"
                    : "bg-amber-300";
              return (
                <div
                  key={item.dateIso}
                  className={`flex items-start gap-3 rounded-lg px-3 py-2 ${styles}`}
                >
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot}`} />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{item.labelTop}</div>
                    <div className="text-xs text-slate-700">{item.labelBottom}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="space-y-3 rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-4 text-sm leading-relaxed text-slate-800">
        <h2 className="text-sm font-semibold text-slate-900">
          Ориентир по питанию
        </h2>
        {nutritionOrient.phase === "loading" ? (
          <p className="text-slate-600">
            Подбираем мягкий ориентир по вашим записям…
          </p>
        ) : nutritionOrient.phase === "sparse" ? (
          <p className="text-slate-700">
            Пока мало данных для оценки. Ориентир появится после нескольких
            заполненных дней.
          </p>
        ) : (
          <>
            <p className="text-slate-700">
              По текстам приёмов пищи получается примерный диапазон в среднем за
              день:{" "}
              <span className="font-medium text-slate-900">
                {nutritionOrient.avgMin}–{nutritionOrient.avgMax} ккал
              </span>
              . Это не точный подсчёт и не медицинская норма — только мягкий
              ориентир.
            </p>
            <p className="text-slate-700">
              {nutritionOrient.tone === "high"
                ? "В некоторые дни питание было плотнее обычного. Это не ошибка — просто ориентир, где можно мягко скорректировать порции."
                : "В целом питание выглядит близко к спокойному рабочему ритму."}
            </p>
          </>
        )}
      </section>
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
      {completed > 0 && pauses > 0 ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950">
          Паузы случаются — это не сброс. Один спокойный шаг сегодня уже возвращает
          ритм без давления и вины.
        </p>
      ) : null}
    </div>
  );
}
