import { useEffect, useMemo, useState } from "react";
import {
  questionnaireDefaults,
  type ClientQuestionnaire,
} from "../modules/questionnaire";
import { buildPersonalProgram } from "../modules/programBuilder";
import { getDayRecoveryMessage } from "../modules/support/dayRecovery";
import { buildLiveSupportMessage } from "../modules/support/liveSupport";
import { buildDaySummaryMessage } from "../modules/support/daySummary";
import type { PageProps } from "./pageProps";

const PROGRAM_SESSION_STORAGE_KEY = "nutrition.programSession";
const DAILY_ACTUALS_STORAGE_KEY = "nutrition.dailyActuals";

type ActualDeviation = "same" | "less" | "more";
type ActualMeals = {
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
};
type ActualMealField = keyof ActualMeals;

type ProgramSessionSnapshot = {
  currentDay?: number;
  totalDays?: number;
};

type DailyActualEntry = {
  deviation: ActualDeviation;
  notes: string;
  caloriesDelta: number;
  completedAt: string;
  summaryMessage?: string;
};

function readProgramSessionSnapshot(): ProgramSessionSnapshot {
  try {
    const raw = localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const p = parsed as ProgramSessionSnapshot;
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

function completeDayInProgramSession(): { currentDay: number; totalDays: number } {
  const fallback = { currentDay: 1, totalDays: 14 };
  try {
    const raw = localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    const parsedUnknown: unknown = raw ? JSON.parse(raw) : null;
    const parsed: Record<string, unknown> =
      parsedUnknown && typeof parsedUnknown === "object"
        ? (parsedUnknown as Record<string, unknown>)
        : {};
    const currentDay =
      typeof parsed.currentDay === "number" && parsed.currentDay > 0
        ? Math.floor(parsed.currentDay)
        : fallback.currentDay;
    const totalDays =
      typeof parsed.totalDays === "number" && parsed.totalDays > 0
        ? Math.floor(parsed.totalDays)
        : fallback.totalDays;
    const nextDay = Math.min(currentDay + 1, totalDays);
    const nextSession = {
      ...parsed,
      currentDay: nextDay,
      totalDays,
      currentScreen: "day",
    };
    localStorage.setItem(PROGRAM_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    return { currentDay: nextDay, totalDays };
  } catch {
    return fallback;
  }
}

function persistProgramSessionCurrentDay(day: number): void {
  try {
    const raw = localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    const parsedUnknown: unknown = raw ? JSON.parse(raw) : null;
    const parsed: Record<string, unknown> =
      parsedUnknown && typeof parsedUnknown === "object"
        ? (parsedUnknown as Record<string, unknown>)
        : {};
    const nextSession = { ...parsed, currentDay: day, currentScreen: "day" };
    localStorage.setItem(PROGRAM_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  } catch {
    // no-op: keep UI responsive even if storage is unavailable
  }
}

function persistDailyActual(
  dayNumber: number,
  deviation: ActualDeviation,
  notes: string,
  fullText: string,
): { caloriesDelta: number; summaryMessage: string } {
  try {
    const raw = localStorage.getItem(DAILY_ACTUALS_STORAGE_KEY);
    const parsedUnknown: unknown = raw ? JSON.parse(raw) : null;
    const parsed: Record<string, unknown> =
      parsedUnknown && typeof parsedUnknown === "object"
        ? (parsedUnknown as Record<string, unknown>)
        : {};

    const trimmedNotes = notes.trim();
    const estimated = estimateCaloriesFromText(fullText);
    const caloriesDelta =
      fullText.trim().length > 0 ? estimated : mapDeviationToCalories(deviation);
    const summaryMessage = buildDaySummaryMessage(deviation, caloriesDelta, trimmedNotes);
    parsed[String(dayNumber)] = {
      deviation,
      notes: trimmedNotes,
      caloriesDelta,
      completedAt: new Date().toISOString(),
      summaryMessage,
    };

    localStorage.setItem(DAILY_ACTUALS_STORAGE_KEY, JSON.stringify(parsed));
    return { caloriesDelta, summaryMessage };
  } catch {
    // no-op: keep UI responsive even if storage is unavailable
    const fallbackCaloriesDelta = mapDeviationToCalories(deviation);
    return {
      caloriesDelta: fallbackCaloriesDelta,
        summaryMessage: buildDaySummaryMessage(
          deviation,
          fallbackCaloriesDelta,
          notes,
        ),
    };
  }
}

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

function mapDeviationToCalories(deviation: ActualDeviation): number {
  switch (deviation) {
    case "less":
      return -200;
    case "more":
      return 300;
    case "same":
    default:
      return 0;
  }
}

function estimateCaloriesFromText(text: string): number {
  const normalized = text.toLowerCase();
  const rules: Array<{ keyword: string; calories: number }> = [
    { keyword: "сахар", calories: 50 },
    { keyword: "печенье", calories: 100 },
    { keyword: "хлеб", calories: 100 },
    { keyword: "батон", calories: 120 },
    { keyword: "бутерброд", calories: 200 },
    { keyword: "колбас", calories: 150 },
    { keyword: "сосиск", calories: 150 },
    { keyword: "макарон", calories: 250 },
    { keyword: "рис", calories: 200 },
    { keyword: "куриц", calories: 150 },
    { keyword: "салат", calories: 50 },
    { keyword: "суп", calories: 150 },
    { keyword: "компот", calories: 100 },
    { keyword: "ролл", calories: 300 },
    { keyword: "пицц", calories: 300 },
  ];

  return rules.reduce(
    (sum, rule) => (normalized.includes(rule.keyword) ? sum + rule.calories : sum),
    0,
  );
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

export function DayPage({
  mock,
  navigate,
  clientQuestionnaire,
}: PageProps & { clientQuestionnaire: ClientQuestionnaire | null }) {
  const [dayCompleted, setDayCompleted] = useState(false);
  const [actualDeviation, setActualDeviation] = useState<ActualDeviation | null>(null);
  const [daySummary, setDaySummary] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  const [actualMeals, setActualMeals] = useState<ActualMeals>({
    breakfast: "",
    lunch: "",
    snacks: "",
    dinner: "",
  });
  const initialSession = readProgramSessionSnapshot();
  const [sessionCurrentDay, setSessionCurrentDay] = useState(
    initialSession.currentDay ?? mock.user.program.currentDay,
  );
  const q = clientQuestionnaire ?? mergeQuestionnaireFromProfile(mock.user.profile);
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
  } catch (_e) {
    // fallback 14
  }
  const personalProgram = useMemo(
    () => buildPersonalProgram(q, { duration }),
    [q, duration],
  );
  const totalDays = personalProgram.totalDays || personalProgram.days.length;
  const currentDay = Math.min(Math.max(sessionCurrentDay, 1), totalDays);
  const isFirstDay = currentDay <= 1;
  const isLastDay = currentDay >= totalDays;
  const currentProgramDay =
    personalProgram.days[currentDay - 1] ??
    personalProgram.days[personalProgram.days.length - 1];
  const wasPreviousDayMissed =
    currentDay > 1 && !readDailyActualEntry(currentDay - 1);
  const hasMedicalData = Boolean(personalProgram.nutritionRules.medicalNote);
  const weightLossGoal = personalProgram.nutritionRules.weightLossGoal;
  const rec = mock.content.recommendations.items[0];

  const updateMealField = (field: ActualMealField, value: string) => {
    setActualMeals((prev) => {
      const next = { ...prev, [field]: value };
      const notes = [next.breakfast, next.lunch, next.snacks, next.dinner]
        .join(" ")
        .trim();
      setLiveMessage(buildLiveSupportMessage(notes));
      return next;
    });
  };

  useEffect(() => {
    const entry = readDailyActualEntry(currentDay);
    if (!entry) {
      setDayCompleted(false);
      setDaySummary(null);
      return;
    }
    setDayCompleted(true);
    setDaySummary(
      entry.summaryMessage ??
        buildDaySummaryMessage(entry.deviation, entry.caloriesDelta, entry.notes),
    );
  }, [currentDay]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">
        День {currentDay} из {totalDays}
      </h1>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isFirstDay}
          onClick={() => {
            const nextDay = Math.max(1, currentDay - 1);
            setSessionCurrentDay(nextDay);
            persistProgramSessionCurrentDay(nextDay);
            setActualDeviation(null);
            setDaySummary(null);
            setLiveMessage(null);
            setActualMeals({ breakfast: "", lunch: "", snacks: "", dinner: "" });
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
        >
          Предыдущий день
        </button>
        <button
          type="button"
          disabled={isLastDay}
          onClick={() => {
            const nextDay = Math.min(totalDays, currentDay + 1);
            setSessionCurrentDay(nextDay);
            persistProgramSessionCurrentDay(nextDay);
            setActualDeviation(null);
            setDaySummary(null);
            setLiveMessage(null);
            setActualMeals({ breakfast: "", lunch: "", snacks: "", dinner: "" });
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
        >
          Следующий день
        </button>
      </div>
      {wasPreviousDayMissed ? (
        <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-950">
          {getDayRecoveryMessage()}
        </div>
      ) : null}
      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <p>
          <span className="text-slate-500">Настрой дня:</span>{" "}
          {currentProgramDay.mood}
        </p>
        <p>
          <span className="text-slate-500">Фокус дня:</span> {currentProgramDay.focus}
        </p>
        <p>
          <span className="text-slate-500">Привычка дня:</span>{" "}
          {currentProgramDay.habit}
        </p>
        <p>
          <span className="text-slate-500">Задание дня:</span>{" "}
          {currentProgramDay.task}
        </p>
        <p>
          <span className="text-slate-500">Поддержка дня:</span>{" "}
          {currentProgramDay.supportMessage}
        </p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-800">Чек-лист</h2>
        <ul className="list-inside list-disc text-sm text-slate-700">
          <li>Вода утром</li>
          <li>Овощи к обеду</li>
          <li>Короткая прогулка</li>
        </ul>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-800">
          Питание на сегодня
        </h2>
        {hasMedicalData ? (
          <p className="mb-2 text-sm text-slate-600">
            Питание показано в мягком режиме с учётом указанных ограничений.
          </p>
        ) : null}
        {weightLossGoal ? (
          <p className="mb-2 text-sm text-slate-600">
            Порции умеренные, перекусы небольшие.
          </p>
        ) : null}
        <div className="space-y-3">
          {currentProgramDay?.meals.map((meal) => (
            <div key={`${currentProgramDay.dayNumber}-${meal.type}`} className="rounded-md border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{meal.title}</p>
              <p>
                <span className="text-slate-500">Блюдо:</span> {meal.dish}
              </p>
              <p>
                <span className="text-slate-500">Порция:</span> {meal.portion}
              </p>
              <p>
                <span className="text-slate-500">Как готовить:</span> {meal.cooking}
              </p>
              {meal.replacement ? (
                <p>
                  <span className="text-slate-500">Замена:</span> {meal.replacement}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-800">
          Если день пошёл не по плану
        </h2>
        <div className="space-y-2 text-sm text-slate-700">
          {[
            currentProgramDay.alternatives.cafeOrCanteen,
            currentProgramDay.alternatives.takeAway,
            currentProgramDay.alternatives.quickOption,
          ]
            .filter((text) => text.trim().length > 0)
            .map((text, idx) => (
              <p key={`${currentProgramDay.dayNumber}-alternative-${idx}`}>{text}</p>
            ))}
        </div>
      </section>
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-800">Рекомендация:</span>{" "}
        {rec?.text}
      </p>
      {!dayCompleted ? (
        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-medium text-slate-800">
              Как сегодня получилось по питанию?
            </h2>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActualDeviation("same")}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  actualDeviation === "same"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Примерно по плану
              </button>
              <button
                type="button"
                onClick={() => setActualDeviation("less")}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  actualDeviation === "less"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Ел(а) меньше
              </button>
              <button
                type="button"
                onClick={() => setActualDeviation("more")}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  actualDeviation === "more"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Ел(а) больше / плотнее
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm text-slate-700">
                Завтрак
                <textarea
                  value={actualMeals.breakfast}
                  onChange={(e) => updateMealField("breakfast", e.target.value)}
                  rows={2}
                  placeholder="например: яйцо, бутерброд, чай с сахаром"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none ring-accent/30 focus:ring"
                />
              </label>
              <label className="block text-sm text-slate-700">
                Обед
                <textarea
                  value={actualMeals.lunch}
                  onChange={(e) => updateMealField("lunch", e.target.value)}
                  rows={2}
                  placeholder="например: суп, салат, хлеб, компот"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none ring-accent/30 focus:ring"
                />
              </label>
              <label className="block text-sm text-slate-700">
                Перекусы
                <textarea
                  value={actualMeals.snacks}
                  onChange={(e) => updateMealField("snacks", e.target.value)}
                  rows={2}
                  placeholder="например: чай + печенье, кофе, фрукт"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none ring-accent/30 focus:ring"
                />
              </label>
              <label className="block text-sm text-slate-700">
                Ужин
                <textarea
                  value={actualMeals.dinner}
                  onChange={(e) => updateMealField("dinner", e.target.value)}
                  rows={2}
                  placeholder="например: макароны с сосиской, хлеб"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none ring-accent/30 focus:ring"
                />
              </label>
              {liveMessage ? (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-600">
                  {liveMessage}
                </p>
              ) : null}
            </div>
          </section>
          <button
            type="button"
            onClick={() => {
              const fullText = [
                actualMeals.breakfast,
                actualMeals.lunch,
                actualMeals.snacks,
                actualMeals.dinner,
              ]
                .join(" ")
                .toLowerCase();
              const notes = [
                `Завтрак: ${actualMeals.breakfast.trim() || "—"}`,
                `Обед: ${actualMeals.lunch.trim() || "—"}`,
                `Перекусы: ${actualMeals.snacks.trim() || "—"}`,
                `Ужин: ${actualMeals.dinner.trim() || "—"}`,
              ].join("\n");
              const savedDeviation = actualDeviation ?? "same";
              const savedResult = persistDailyActual(
                currentDay,
                savedDeviation,
                notes,
                fullText,
              );
              setDaySummary(savedResult.summaryMessage);
              setDayCompleted(true);
              const next = completeDayInProgramSession();
              setSessionCurrentDay(Math.min(Math.max(next.currentDay, 1), totalDays));
              setActualDeviation(null);
              setLiveMessage(null);
              setActualMeals({ breakfast: "", lunch: "", snacks: "", dinner: "" });
            }}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Отметить день выполненным
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            role="status"
            className="rounded-xl border border-green-200/90 bg-green-50/90 px-4 py-3 text-sm leading-relaxed text-green-950"
          >
            День отмечен выполненным. Отличный старт — можно вернуться на
            главный экран или продолжить завтра.
          </div>
          {daySummary ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
              {daySummary}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => navigate("dashboard")}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
          >
            Вернуться на главный экран
          </button>
          <button
            type="button"
            onClick={() => {
              setDayCompleted(false);
              const next = readProgramSessionSnapshot();
              const nextCurrentDay = next.currentDay ?? currentDay;
              setSessionCurrentDay(Math.min(Math.max(nextCurrentDay, 1), totalDays));
              setActualDeviation(null);
              setDaySummary(null);
              setLiveMessage(null);
              setActualMeals({ breakfast: "", lunch: "", snacks: "", dinner: "" });
            }}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            {currentDay <= 2 ? "Перейти ко дню 2" : "Перейти к следующему дню"}
          </button>
        </div>
      )}
      {!dayCompleted ? (
        <p className="rounded-md bg-surface-muted p-3 text-sm text-slate-600">
          Мягкий итог дня после выполнения появится здесь (мок).
        </p>
      ) : null}
    </div>
  );
}
