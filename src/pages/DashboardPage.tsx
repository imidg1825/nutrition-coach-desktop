import { useMemo } from "react";
import {
  questionnaireDefaults,
  type ClientQuestionnaire,
} from "../modules/questionnaire";
import { buildPersonalProgram } from "../modules/programBuilder";
import { countCompletedDaysFromDailyActuals } from "../modules/support/completedDays";
import { consumeReturnAfterBreakMessage } from "../modules/support/returnAfterBreak";
import type { PageProps } from "./pageProps";

const PROGRAM_SESSION_STORAGE_KEY = "nutrition.programSession";
const DAILY_ACTUALS_STORAGE_KEY = "nutrition.dailyActuals";

type DailyDeviation = "same" | "less" | "more";

type DailyActualEntry = {
  deviation: DailyDeviation;
  notes: string;
  caloriesDelta: number;
  completedAt: string;
  summaryMessage?: string;
};

function readDailyActualEntry(dayNumber: number): DailyActualEntry | null {
  try {
    const raw = localStorage.getItem(DAILY_ACTUALS_STORAGE_KEY);
    const parsedUnknown: unknown = raw ? JSON.parse(raw) : null;
    if (!parsedUnknown || typeof parsedUnknown !== "object") return null;
    const entryUnknown = (parsedUnknown as Record<string, unknown>)[
      String(dayNumber)
    ];
    if (!entryUnknown || typeof entryUnknown !== "object") return null;
    const entry = entryUnknown as Partial<DailyActualEntry>;
    if (
      (entry.deviation === "same" ||
        entry.deviation === "less" ||
        entry.deviation === "more") &&
      typeof entry.notes === "string" &&
      typeof entry.caloriesDelta === "number" &&
      typeof entry.completedAt === "string"
    ) {
      return {
        deviation: entry.deviation,
        notes: entry.notes,
        caloriesDelta: entry.caloriesDelta,
        completedAt: entry.completedAt,
        summaryMessage:
          typeof entry.summaryMessage === "string" ? entry.summaryMessage : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

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

function hasDailyActualForDay(dayNumber: number): boolean {
  try {
    const raw = localStorage.getItem(DAILY_ACTUALS_STORAGE_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;
    const entryUnknown = (parsed as Record<string, unknown>)[String(dayNumber)];
    if (!entryUnknown || typeof entryUnknown !== "object") return false;
    const e = entryUnknown as Record<string, unknown>;
    return (
      (e.deviation === "same" ||
        e.deviation === "less" ||
        e.deviation === "more") &&
      typeof e.notes === "string" &&
      typeof e.caloriesDelta === "number" &&
      typeof e.completedAt === "string"
    );
  } catch {
    return false;
  }
}

function countCompletionStreakFromStart(): number {
  let streak = 0;
  while (hasDailyActualForDay(streak + 1)) {
    streak += 1;
  }
  return streak;
}

function persistProgramSessionCurrentDay(day: number): void {
  try {
    const raw = localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    const parsedUnknown: unknown = raw ? JSON.parse(raw) : null;
    const parsed: Record<string, unknown> =
      parsedUnknown && typeof parsedUnknown === "object"
        ? (parsedUnknown as Record<string, unknown>)
        : {};
    const nextSession = { ...parsed, currentDay: day };
    localStorage.setItem(PROGRAM_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  } catch {
    // no-op
  }
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
  };
}

function getTodayContextMessage({
  nextActionDay,
}: {
  nextActionDay: number;
}): string {
  if (nextActionDay === 1) {
    return "Сегодня первый день. Не нужно делать идеально — важно просто начать.";
  }
  return `Продолжаем с дня ${nextActionDay}. Главное — спокойно вернуться к плану и сделать один понятный шаг.`;
}

export function DashboardPage({
  mock,
  navigate,
  clientQuestionnaire,
}: PageProps & { clientQuestionnaire: ClientQuestionnaire | null }) {
  const { profile, program } = mock.user;
  const session = readProgramSessionDayInfo();
  const currentDay = session.currentDay ?? program.currentDay;

  const programConfigRaw = localStorage.getItem("nutrition.programConfig");
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
  } catch {
    // keep default
  }

  const q = clientQuestionnaire ?? mergeQuestionnaireFromProfile(mock.user.profile);
  const personalProgram = useMemo(
    () => buildPersonalProgram(q, { duration }),
    [q, duration],
  );
  const totalDays = personalProgram.totalDays || personalProgram.days.length;

  const yesterdayDay = currentDay - 1;
  const yesterdayEntry = readDailyActualEntry(yesterdayDay);
  const hasYesterdayEntry = Boolean(yesterdayEntry);
  const completed = countCompletedDaysFromDailyActuals();
  const nextActionDay = Math.min(completed + 1, totalDays);
  const isNextActionDayCompleted = Boolean(readDailyActualEntry(nextActionDay));
  const streak = countCompletionStreakFromStart();
  const todayProgramDay =
    personalProgram.days[nextActionDay - 1] ??
    personalProgram.days[personalProgram.days.length - 1];
  const returnAfterBreakMessage = useMemo(() => consumeReturnAfterBreakMessage(), []);

  const ctaLabel = isNextActionDayCompleted
    ? `Посмотреть день ${nextActionDay}`
    : `Продолжить день ${nextActionDay}`;

  const ctaHint =
    !hasYesterdayEntry && currentDay > 1
      ? "Без попыток догнать — просто продолжаем с текущего дня."
      : "Продолжаем в том темпе, который уже получается.";

  const progressPercent = Math.round((completed / totalDays) * 100);
  const streakDays = streak;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Главный экран наставника</h1>
      {returnAfterBreakMessage ? (
        <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-950">
          {returnAfterBreakMessage}
        </div>
      ) : null}
      <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
        <div className="mb-1 text-xs font-medium text-emerald-700">
          Сегодня
        </div>
        <div>
          {getTodayContextMessage({
            nextActionDay,
          })}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Прогресс по дням
          </h2>
          <p className="mt-1 text-2xl font-semibold">
            Пройдено {completed} из {totalDays}
          </p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Цель клиента
          </h2>
          <p className="mt-1 text-sm text-slate-800">{profile.goal}</p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Прогресс
          </h2>
          <p className="mt-1 text-2xl font-semibold">{progressPercent}%</p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Серия выполнений
          </h2>
          <p className="mt-1 text-2xl font-semibold">{streakDays} дн.</p>
        </section>
      </div>
      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Сегодня</h2>
        <p>
          <span className="text-slate-500">Настрой дня:</span>{" "}
          {todayProgramDay.mood}
        </p>
        <p>
          <span className="text-slate-500">Привычка дня:</span>{" "}
          {todayProgramDay.habit}
        </p>
        <p>
          <span className="text-slate-500">Задание дня:</span>{" "}
          {todayProgramDay.task}
        </p>
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
          {todayProgramDay.supportMessage}
        </p>
      </section>
      <p className="text-sm text-slate-700">Сейчас: день {nextActionDay}</p>
      <button
        type="button"
        onClick={() => {
          persistProgramSessionCurrentDay(nextActionDay);
          navigate("day");
        }}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        {ctaLabel}
      </button>
      <p className="text-sm text-slate-600">{ctaHint}</p>
    </div>
  );
}
