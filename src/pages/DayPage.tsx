import { useEffect, useMemo, useState } from "react";
import {
  questionnaireDefaults,
  type ClientQuestionnaire,
} from "../modules/questionnaire";
import {
  getPersonalProgram,
  type PersonalProgram,
} from "../modules/programBuilder";
import { buildAssistantResponse } from "../modules/ai/assistantResponse";
import { buildOlesyaChatResponse } from "../modules/ai/olesyaChatResponse";
import {
  detectUserProfileFromScenarios,
  getDetectedScenarios,
  getRecoveryActivation,
} from "../modules/support/behaviorAnalysis";
import { applyRecoveryToProgramDay } from "../modules/support/recoveryAdjustments";
import {
  activateOrRefreshRecovery,
  decrementRecoveryAfterCompletion,
  readRecoveryState,
} from "../modules/support/recoveryMode";
import { consumeReturnAfterBreakMessage } from "../modules/support/returnAfterBreak";
import {
  buildDaySummaryMessage,
  buildTomorrowSuggestion,
} from "../modules/support/daySummary";
import type { PageProps } from "./pageProps";

const PROGRAM_SESSION_STORAGE_KEY = "nutrition.programSession";
const DAILY_ACTUALS_STORAGE_KEY = "nutrition.dailyActuals";

const OLESYA_DAY_TIPS = [
  "Сегодня не нужно идеально — важно просто продолжать",
  "Если день сбился — просто вернитесь к следующему приёму пищи",
  "Стакан воды и нормальный обед уже делают день лучше",
  "Не ругайте себя — система строится шаг за шагом",
  "Регулярность важнее идеального меню",
  "Маленький шаг сегодня — это уже прогресс",
  "Усталость — не повод сдаваться, а сигнал отдохнуть и продолжить",
  "Выберите один простой приём пищи и сделайте его спокойно",
  "Один день не определяет всю историю — у вас есть завтра",
  "План — это ориентир, а не кандалы: можно мягко подстроиться",
  "Поощряйте себя за попытку, даже если всё не получилось",
  "Тело слышит заботу: еда без спешки уже помогает",
  "Если хочется сорваться — сделайте паузу и выпейте воды",
  "Вы уже здесь — это значит, что вы не сдались",
  "Спокойный вечер лучше идеального утра на нервах",
];

function softReminderFromHour(hour: number): string {
  if (hour < 12) {
    return "Начните день спокойно. Можно выпить воду и не спешить с идеальностью";
  }
  if (hour < 18) {
    return "Если ещё не было нормального приёма пищи — лучше поесть спокойно сейчас";
  }
  return "Вечером не нужно догонять день едой. Достаточно лёгкого ужина";
}

function getLiveSupportMessage(
  isBinge: boolean,
  isSkip: boolean,
  isFatigue: boolean,
  isSweet: boolean,
): string | null {
  if (isBinge) {
    return "Похоже, день пошёл не по плану. Это не повод начинать сначала или наказывать себя. Достаточно спокойно вернуться к следующему приёму пищи.";
  }
  if (isSkip) {
    return "Похоже, сегодня не получилось нормально поесть. Такое часто бывает, когда день плотный или много дел. Сейчас важно не пропускать дальше — можно спокойно сделать следующий приём пищи без перегрузки.";
  }
  if (isFatigue) {
    return "Похоже, сегодня много усталости. В такие дни важно не требовать от себя идеального режима — достаточно простого спокойного питания и отдыха.";
  }
  if (isSweet) {
    return "Похоже, сегодня тянет на сладкое. Такое часто бывает при усталости или нерегулярном питании. Можно не ругать себя и спокойно продолжить.";
  }
  return null;
}

type LiveSupportActionScenario = "binge" | "skip" | "fatigue";

const LIVE_SUPPORT_ACTION_ITEMS: Record<
  LiveSupportActionScenario,
  readonly string[]
> = {
  binge: [
    "Сейчас не нужно ничего компенсировать или наказывать себя",
    "Следующий приём пищи — обычный, без ограничений",
    "Воду в течение дня пить нужно — это поможет мягко вернуться в ритм",
  ],
  skip: [
    "Сейчас спокойно поесть, даже если уже не по плану",
    "Не пропускать следующий приём пищи",
    "Воду в течение дня пить нужно — начните со стакана прямо сейчас",
  ],
  fatigue: [
    "Выбрать самый простой приём пищи без сложной готовки",
    "Не усиливать нагрузку вечером",
    "Воду в течение дня пить нужно — это поможет поддержать состояние",
  ],
};

type ActualDeviation = "same" | "less" | "more";
type ActualMeals = {
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
};
type ActualMealField = keyof ActualMeals;

type DailyActualEntry = {
  deviation: ActualDeviation;
  notes: string;
  caloriesDelta: number;
  completedAt: string;
  summaryMessage?: string;
};


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
  isCompletionConfirmed: boolean,
): { caloriesDelta: number; summaryMessage: string } {
  if (!isCompletionConfirmed) {
    const fallbackCaloriesDelta = mapDeviationToCalories(deviation);
    return {
      caloriesDelta: fallbackCaloriesDelta,
      summaryMessage: buildDaySummaryMessage(deviation, fallbackCaloriesDelta, notes, dayNumber),
    };
  }
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
    const summaryMessage = buildDaySummaryMessage(
      deviation,
      caloriesDelta,
      trimmedNotes,
      dayNumber,
    );
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
          dayNumber,
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

function parseDayContextFromNotes(notes: string): string {
  const prefix = "Как прошёл день:\n";
  if (!notes.startsWith(prefix)) return "";
  const rest = notes.slice(prefix.length);
  const idx = rest.indexOf("\n\nЗавтрак:");
  if (idx === -1) return rest.trim();
  return rest.slice(0, idx).trim();
}

function countCompletedDaysFromDailyActuals(): number {
  try {
    const raw = localStorage.getItem(DAILY_ACTUALS_STORAGE_KEY);
    if (!raw) return 0;
    const parsedUnknown: unknown = JSON.parse(raw);
    if (!parsedUnknown || typeof parsedUnknown !== "object") return 0;
    return Object.values(parsedUnknown as Record<string, unknown>).filter((entryUnknown) => {
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
    }).length;
  } catch {
    return 0;
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
    healthAndAnalyses: {
      ...questionnaireDefaults.healthAndAnalyses,
      ...q?.healthAndAnalyses,
    },
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
  const [tomorrowSuggestion, setTomorrowSuggestion] = useState<string | null>(null);
  const [dayContext, setDayContext] = useState("");
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
  const [actualMeals, setActualMeals] = useState<ActualMeals>({
    breakfast: "",
    lunch: "",
    snacks: "",
    dinner: "",
  });
  const [chatMessage, setChatMessage] = useState("");
  const [chatReply, setChatReply] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
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
  const [displayDayNumber, setDisplayDayNumber] = useState<number>(() =>
    countCompletedDaysFromDailyActuals() + 1,
  );
  const [personalProgram, setPersonalProgram] = useState<PersonalProgram | null>(
    null,
  );
  const [olesyaTip] = useState(() => {
    const tips = OLESYA_DAY_TIPS;
    return tips[Math.floor(Math.random() * tips.length)] ?? "";
  });

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
    const td = personalProgram.totalDays || personalProgram.days.length;
    setDisplayDayNumber((d) => Math.min(d, td));
  }, [personalProgram]);

  const returnAfterBreakMessage = useMemo(
    () => consumeReturnAfterBreakMessage(),
    [],
  );

  useEffect(() => {
    const entry = readDailyActualEntry(displayDayNumber);
    if (!entry) {
      setDayCompleted(false);
      setDaySummary(null);
      setTomorrowSuggestion(null);
      setAssistantResponse(null);
      setDayContext("");
      return;
    }
    const storedDayContext = parseDayContextFromNotes(entry.notes);
    setDayContext(storedDayContext);
    setDayCompleted(true);
    setDaySummary(
      entry.summaryMessage ??
        buildDaySummaryMessage(
          entry.deviation,
          entry.caloriesDelta,
          entry.notes,
          displayDayNumber,
        ),
    );
    setTomorrowSuggestion(
      buildTomorrowSuggestion(entry.deviation, entry.caloriesDelta, entry.notes),
    );
    const normalizedNotes = entry.notes.trim().toLowerCase();
    const scenarios = getDetectedScenarios(normalizedNotes);
    const profile = detectUserProfileFromScenarios(scenarios);
    setAssistantResponse(
      buildAssistantResponse({
        notes: entry.notes,
        deviation: entry.deviation,
        scenarios,
        profile,
        context: storedDayContext,
        preferredAddressing:
          clientQuestionnaire?.basics.preferredAddressing ?? "neutral",
        firstName: clientQuestionnaire?.basics.firstName,
      }),
    );
  }, [displayDayNumber]);

  if (personalProgram === null) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Олеся собирает программу под вашу анкету, ограничения и привычки...
      </div>
    );
  }

  const totalDays = personalProgram.totalDays || personalProgram.days.length;
  const currentProgramDay =
    personalProgram.days[displayDayNumber - 1] ??
    personalProgram.days[personalProgram.days.length - 1];
  const recoveryState = readRecoveryState();
  const displayDay = applyRecoveryToProgramDay(currentProgramDay, recoveryState);
  const hasMedicalData = Boolean(personalProgram.nutritionRules.medicalNote);
  const weightLossGoal = personalProgram.nutritionRules.weightLossGoal;
  const rec = mock.content.recommendations.items[0];

  const updateMealField = (field: ActualMealField, value: string) => {
    setActualMeals((prev) => ({ ...prev, [field]: value }));
  };

  const softReminder = softReminderFromHour(new Date().getHours());

  const mealFieldsLower = [
    actualMeals.breakfast,
    actualMeals.lunch,
    actualMeals.snacks,
    actualMeals.dinner,
  ]
    .join(" ")
    .toLowerCase();
  const liveSupportBingeKeywords = ["срыв", "переел"] as const;
  const liveSupportSkipKeywords = [
    "не ел",
    "не ела",
    "не успел",
    "забыл поесть",
    "не было времени",
  ] as const;
  const liveSupportFatigueKeywords = [
    "устал",
    "устала",
    "нет сил",
    "тяжелый день",
    "тяжёлый день",
    "вымоталась",
    "вымотался",
  ] as const;
  const liveSupportSweetKeywords = ["слад", "печень", "шокол"] as const;
  const isLiveSupportBingeScenario = liveSupportBingeKeywords.some((w) =>
    mealFieldsLower.includes(w),
  );
  const isLiveSupportSkipScenario = liveSupportSkipKeywords.some((w) =>
    mealFieldsLower.includes(w),
  );
  const isLiveSupportFatigueScenario = liveSupportFatigueKeywords.some((w) =>
    mealFieldsLower.includes(w),
  );
  const isLiveSupportSweetScenario = liveSupportSweetKeywords.some((w) =>
    mealFieldsLower.includes(w),
  );
  const liveSupportMessage = getLiveSupportMessage(
    isLiveSupportBingeScenario,
    isLiveSupportSkipScenario,
    isLiveSupportFatigueScenario,
    isLiveSupportSweetScenario,
  );

  const liveSupportActionScenario: LiveSupportActionScenario | null =
    isLiveSupportBingeScenario
      ? "binge"
      : isLiveSupportSkipScenario
        ? "skip"
        : isLiveSupportFatigueScenario
          ? "fatigue"
          : null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <button
        type="button"
        onClick={() => navigate("dashboard")}
        className="text-sm text-slate-600 hover:text-slate-900"
      >
        ← Назад
      </button>
      <h1 className="text-xl font-semibold">
        День {displayDayNumber} из {totalDays}
      </h1>
      {returnAfterBreakMessage ? (
        <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-950">
          {returnAfterBreakMessage}
        </div>
      ) : null}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm leading-snug">
          <dt className="font-medium text-slate-600">Настрой дня:</dt>
          <dd className="min-w-0 text-slate-800">{currentProgramDay.mood}</dd>
          <dt className="font-medium text-slate-600">Фокус дня:</dt>
          <dd className="min-w-0 text-slate-800">{displayDay.focus}</dd>
          <dt className="font-medium text-slate-600">Привычка дня:</dt>
          <dd className="min-w-0 text-slate-800">{currentProgramDay.habit}</dd>
          <dt className="font-medium text-slate-600">Задание дня:</dt>
          <dd className="min-w-0 text-slate-800">{displayDay.task}</dd>
          <dt className="font-medium text-slate-600">Поддержка дня:</dt>
          <dd className="min-w-0 text-slate-800">{displayDay.supportMessage}</dd>
        </dl>
      </section>
      <section className="rounded-lg border border-violet-200/80 bg-violet-100/60 px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-violet-950">
          <span aria-hidden="true">💬</span>
          Подсказка от Олеси
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-800">
          {olesyaTip}
        </p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight text-slate-800">
          Мягкое напоминание от Олеси
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {softReminder}
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
            <label className="block text-sm text-slate-700">
              Как прошёл день? (что повлияло)
              <textarea
                value={dayContext}
                onChange={(e) => setDayContext(e.target.value)}
                rows={3}
                placeholder={
                  "устал, мотался по делам, не успел поесть\nстресс, ел на ходу\nспокойный день"
                }
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none ring-accent/30 focus:ring"
              />
            </label>
          </section>
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
            </div>
            {liveSupportMessage ? (
              <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                {liveSupportMessage}
              </div>
            ) : null}
            {liveSupportActionScenario ? (
              <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">
                  Что можно сделать дальше
                </h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
                  {LIVE_SUPPORT_ACTION_ITEMS[liveSupportActionScenario].map(
                    (line, idx) => (
                      <li key={`${liveSupportActionScenario}-${idx}`}>{line}</li>
                    ),
                  )}
                </ul>
              </div>
            ) : null}
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Чат с Олесей</h2>
              <p className="mb-3 text-sm text-slate-600">
                Можно написать про питание, тревоги, усталость или то, что мешает пройти день.
              </p>
              <div className="mb-3">
                <p className="mb-1 text-xs text-slate-500">Задайте мне вопрос</p>
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  rows={3}
                  placeholder="Например: тревожно, весь день тянет на сладкое, боюсь сорваться вечером"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none ring-accent/30 focus:ring"
                />
              </div>
              <button
                type="button"
                disabled={chatLoading}
                onClick={async () => {
                  if (!chatMessage.trim()) return;
                  setChatLoading(true);
                  setChatError(null);
                  try {
                    const reply = await buildOlesyaChatResponse({
                      userMessage: chatMessage,
                      dayContext,
                      actualMeals,
                      clientQuestionnaire: q,
                    });
                    setChatReply(reply);
                  } catch (err: unknown) {
                    setChatError(err instanceof Error ? err.message : String(err));
                  } finally {
                    setChatLoading(false);
                  }
                }}
                className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
              >
                {chatLoading ? "Жду ответ..." : "Спросить Олесю"}
              </button>
              {chatError ? (
                <p className="mt-3 text-sm text-red-700">{chatError}</p>
              ) : null}
              {chatLoading ? (
                <div className="mt-3 rounded-xl border border-violet-200 bg-violet-100/70 p-4 text-sm text-violet-950">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-violet-800">
                    Олеся отвечает
                  </p>
                  <p>Олеся печатает...</p>
                </div>
              ) : chatReply ? (
                <div className="mt-3 rounded-xl border border-violet-200 bg-violet-100/70 p-4 text-sm text-violet-950">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-violet-800">
                    Олеся отвечает
                  </p>
                  <p className="whitespace-pre-wrap">{chatReply}</p>
                </div>
              ) : null}
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
              const mealNotes = [
                `Завтрак: ${actualMeals.breakfast.trim() || "—"}`,
                `Обед: ${actualMeals.lunch.trim() || "—"}`,
                `Перекусы: ${actualMeals.snacks.trim() || "—"}`,
                `Ужин: ${actualMeals.dinner.trim() || "—"}`,
              ].join("\n");
              const notes = dayContext.trim()
                ? `Как прошёл день:\n${dayContext.trim()}\n\n${mealNotes}`
                : mealNotes;
              const savedDeviation = actualDeviation ?? "same";
              const savedResult = persistDailyActual(
                displayDayNumber,
                savedDeviation,
                notes,
                fullText,
                true,
              );
              decrementRecoveryAfterCompletion();
              const fullDayText = `${fullText} ${notes} ${dayContext}`
                .trim()
                .toLowerCase();
              const recoveryActivation = getRecoveryActivation(fullDayText);
              if (recoveryActivation.shouldActivate) {
                activateOrRefreshRecovery({
                  currentDay: displayDayNumber,
                  triggeredBy: recoveryActivation.triggeredBy,
                  durationDays: recoveryActivation.durationDays,
                });
              }
              setDaySummary(savedResult.summaryMessage);
              const scenarios = getDetectedScenarios(fullDayText);
              const profile = detectUserProfileFromScenarios(scenarios);

              const assistantResponse = buildAssistantResponse({
                notes,
                deviation: savedDeviation,
                scenarios,
                profile,
                context: dayContext,
                preferredAddressing:
                  clientQuestionnaire?.basics.preferredAddressing ?? "neutral",
                firstName: clientQuestionnaire?.basics.firstName,
              });

              setAssistantResponse(assistantResponse);
              setTomorrowSuggestion(
                buildTomorrowSuggestion(savedDeviation, savedResult.caloriesDelta, notes),
              );
              setDayCompleted(true);
              setActualDeviation(null);
              setActualMeals({ breakfast: "", lunch: "", snacks: "", dinner: "" });
            }}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Отметить день выполненным
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {daySummary ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
              <p className="mb-1 font-medium text-slate-900">Итог дня</p>
              <p>{daySummary}</p>
            </div>
          ) : null}
          {dayContext.trim() ? (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <p className="mb-1 font-medium text-slate-900">Вы написали:</p>
              <p className="whitespace-pre-wrap">{dayContext}</p>
            </div>
          ) : null}
          {assistantResponse ? (
            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-700">
                Олеся отвечает
              </p>
              <p className="whitespace-pre-wrap">{assistantResponse}</p>
            </div>
          ) : null}
          {tomorrowSuggestion ? (
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Завтра можно так:</span>{" "}
              {tomorrowSuggestion}
            </p>
          ) : null}
          <div
            role="status"
            className="rounded-xl border border-green-200/90 bg-green-50/90 px-4 py-3 text-sm leading-relaxed text-green-950"
          >
            День отмечен выполненным. Отличный старт — можно вернуться на
            главный экран или продолжить завтра.
          </div>
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
              const nextDay = Math.min(countCompletedDaysFromDailyActuals() + 1, totalDays);
              setDisplayDayNumber(nextDay);
              persistProgramSessionCurrentDay(nextDay);
              setDayCompleted(false);
              setActualDeviation(null);
              setDaySummary(null);
              setTomorrowSuggestion(null);
              setAssistantResponse(null);
              setDayContext("");
              setActualMeals({ breakfast: "", lunch: "", snacks: "", dinner: "" });
              setChatMessage("");
              setChatReply(null);
              setChatError(null);
            }}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            Перейти к следующему дню
          </button>
        </div>
      )}
    </div>
  );
}
