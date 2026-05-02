import behaviorScenarios from "../../data/seed/behavior-scenarios.json";
import type { RecoveryTriggerScenario } from "./recoveryMode";

export type LiveDayMeals = {
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
  /** Свободный текст «Как прошёл день» — учитывается в live-наблюдении вместе с приёмами пищи. */
  dayContext?: string;
};

type LiveScenarioConfig = {
  message?: string;
  liveMessage?: string;
  recommendedAction?: string;
};

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

const LIVE_SCENARIO_KEYWORDS = {
  overeating: [
    "переел",
    "переела",
    "сорвал",
    "сорвалась",
    "фастфуд",
    "бургер",
    "пицца",
    "ролл",
    "шаурм",
  ],
  sweetsCraving: ["сладк", "шоколад", "печенье", "конфет", "сахар", "пирожн"],
  eveningSnacking: [
    "вечером",
    "вечер",
    "ночью",
    "перед сном",
    "перекус",
    "перекусы",
    "доел",
    "доела",
  ],
  fatigueChaoticDay: [
    "устал",
    "устала",
    "без сил",
    "вымот",
    "нет сил",
    "тяжёл",
    "тяжел",
    "тежол",
    "тижол",
    "тяжело",
    "тяжелый день",
    "тяжёлый день",
    "хаос",
    "завал",
    "стресс",
    "нервы",
    "ел как попало",
    "ела как попало",
  ],
  noTimeToCook: [
    "не успел приготовить",
    "не успела приготовить",
    "не готовил",
    "не готовила",
    "ел что было",
    "ела что было",
    "на ходу",
  ],
};

export type LiveScenarioKey = keyof typeof LIVE_SCENARIO_KEYWORDS;

const LIVE_SCENARIO_PRIORITY: LiveScenarioKey[] = [
  "overeating",
  "sweetsCraving",
  "eveningSnacking",
  "fatigueChaoticDay",
  "noTimeToCook",
];

function composeDayNotes(input: string | LiveDayMeals): string {
  if (typeof input === "string") return input.trim().toLowerCase();
  return [
    input.dayContext ?? "",
    input.breakfast,
    input.lunch,
    input.snacks,
    input.dinner,
  ]
    .join(" ")
    .trim()
    .toLowerCase();
}

export function getDetectedScenarios(input: string | LiveDayMeals): LiveScenarioKey[] {
  const normalized = composeDayNotes(input);
  if (normalized.length < 6) return [];
  return LIVE_SCENARIO_PRIORITY.filter((scenario) =>
    includesAny(normalized, LIVE_SCENARIO_KEYWORDS[scenario]),
  );
}

export function detectLiveScenarios(notes: string): LiveScenarioKey[] {
  return getDetectedScenarios(notes);
}

export function detectLiveScenario(notes: string): LiveScenarioKey | null {
  const detected = getDetectedScenarios(notes);
  return detected.length > 0 ? detected[0] : null;
}

function getScenarioConfig(scenario: LiveScenarioKey): LiveScenarioConfig | null {
  const config = (behaviorScenarios as Record<string, LiveScenarioConfig>)[scenario];
  return config ?? null;
}

export function getLiveScenarioMessage(scenario: LiveScenarioKey): string | null {
  const config = getScenarioConfig(scenario);
  if (!config?.liveMessage || config.liveMessage.trim().length === 0) return null;
  return config.liveMessage;
}

export function getScenarioRecommendedAction(scenario: LiveScenarioKey): string | null {
  const config = getScenarioConfig(scenario);
  if (!config?.recommendedAction || config.recommendedAction.trim().length === 0) return null;
  return config.recommendedAction;
}

export function getScenarioExplanation(scenario: LiveScenarioKey): string | null {
  const config = getScenarioConfig(scenario);
  if (!config?.message || config.message.trim().length === 0) return null;
  return config.message;
}

export function getMultiScenarioDayInsight(
  notes: string,
): { explanation: string; recommendedAction: string } | null {
  const scenarios = getDetectedScenarios(notes);
  if (scenarios.length < 2) return null;

  const reasonByScenario: Record<LiveScenarioKey, string> = {
    sweetsCraving: "сладкое",
    overeating: "более плотная еда",
    fatigueChaoticDay: "усталость и хаотичный день",
    eveningSnacking: "вечерние перекусы",
    noTimeToCook: "не было времени готовить",
  };

  const reasons = scenarios.map((scenario) => reasonByScenario[scenario]).slice(0, 3);
  const reasonsText =
    reasons.length === 2
      ? `${reasons[0]} и ${reasons[1]}`
      : `${reasons.slice(0, -1).join(", ")} и ${reasons[reasons.length - 1]}`;
  const explanation = `Похоже, сегодня совпали несколько факторов: ${reasonsText}. Такое бывает.`;

  return {
    explanation,
    recommendedAction:
      "Завтра можно выбрать один простой ориентир: нормальный обед или спокойный ужин. Этого уже достаточно.",
  };
}

export function getLiveCombinedDayMessage(meals: LiveDayMeals): string | null {
  const dayNotes = composeDayNotes(meals);
  const multiScenarioInsight = getMultiScenarioDayInsight(dayNotes);
  if (multiScenarioInsight) {
    return `${multiScenarioInsight.explanation} ${multiScenarioInsight.recommendedAction}`;
  }
  return null;
}

export function getDaySummaryInsight(
  notes: string,
): { explanation: string; recommendedAction: string | null } | null {
  const multiScenarioInsight = getMultiScenarioDayInsight(notes);
  if (multiScenarioInsight) {
    return multiScenarioInsight;
  }

  const detected = getDetectedScenarios(notes);
  const primaryScenario = detected.length > 0 ? detected[0] : null;
  if (!primaryScenario) return null;

  return {
    explanation:
      getScenarioExplanation(primaryScenario) ??
      "Сегодня в питании был непростой момент, и это нормально.",
    recommendedAction: getScenarioRecommendedAction(primaryScenario),
  };
}

export function getRecoveryActivation(input: string | LiveDayMeals): {
  shouldActivate: boolean;
  triggeredBy: RecoveryTriggerScenario[];
  durationDays: 2 | 3;
} {
  const detected = getDetectedScenarios(input);
  const recoveryCandidates: RecoveryTriggerScenario[] = [
    "overeating",
    "sweetsCraving",
    "fatigueChaoticDay",
    "eveningSnacking",
  ];
  const triggeredBy = detected.filter((scenario): scenario is RecoveryTriggerScenario =>
    recoveryCandidates.includes(scenario as RecoveryTriggerScenario),
  );

  if (triggeredBy.length === 0) {
    return {
      shouldActivate: false,
      triggeredBy: [],
      durationDays: 2,
    };
  }

  return {
    shouldActivate: true,
    triggeredBy,
    durationDays: triggeredBy.length >= 2 ? 3 : 2,
  };
}

export type UserProfileType = "default" | "fatigue";

export function detectUserProfileFromScenarios(
  scenarios: string[],
): UserProfileType {
  const fatigueScenarios = ["fatigueChaoticDay"];

  const fatigueCount = scenarios.filter((s) =>
    fatigueScenarios.includes(s),
  ).length;

  // если есть fatigue — считаем пользователя перегруженным
  if (fatigueCount >= 1) {
    return "fatigue";
  }

  return "default";
}

