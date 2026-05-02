export type ChatIntent =
  | "nutrition"
  | "day_reflection"
  | "wellbeing"
  | "offtopic"
  | "boundary"
  | "medical";

/** Подстроки и фразы: сексуальное/провокационное/агрессивное (не использовать голое «мат» — ложные срабатывания на «формат», «математика»). */
const BOUNDARY_INCLUDES = [
  "секс",
  "заняться сексом",
  "хочу тебя",
  "переспать",
  "возбужд",
  "эрот",
  "голая",
  "голый",
  "интим",
  "оскорб",
  "агресс",
  "порно",
  "изнасил",
  "насили",
  "мастурб",
  "миньет",
  "кунилинг",
  "феллац",
  "инцест",
  "педоф",
  "шлюх",
  "убью",
  "убей",
  "пидор",
  "пидар",
  "мудак",
  "гондон",
  "долбоеб",
  "нахуй",
  "похуй",
  "похер",
  "иди нах",
  "пошёл нах",
  "пошел нах",
];

/** Отдельные токены мата/оскорблений (после нормализации пробелов). */
const BOUNDARY_TOKENS = new Set([
  "блять",
  "блядь",
  "бляди",
  "сука",
  "суки",
  "хуй",
  "хуя",
  "хуи",
  "хуе",
  "хуйло",
  "пизда",
  "пиздец",
  "пизду",
  "ёб",
  "ебать",
  "ебал",
  "ебан",
  "ебёт",
  "ебет",
  "ебну",
  "хер",
  "чмо",
  "урод",
  "дебил",
  "мразь",
  "сволочь",
  "гнида",
]);

function normalizeForTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/iu)
    .filter(Boolean);
}

function matchesBoundary(text: string): boolean {
  if (BOUNDARY_INCLUDES.some((s) => text.includes(s))) return true;
  const tokens = normalizeForTokens(text);
  return tokens.some((t) => BOUNDARY_TOKENS.has(t));
}

/** Подстроки без коротких двусмысленных маркеров (например «бад» → «бадминтон» — только через токены). */
const MEDICAL_INCLUDES = [
  "препарат",
  "препараты",
  "лекарство",
  "лекарства",
  "таблетка",
  "таблетки",
  "капсулы",
  "добавка",
  "добавки",
  "витамин",
  "витамины",
  "омега",
  "магний",
  "железо",
  "йод",
  "пробиотик",
  "гормоны",
  "анализы",
  "диагноз",
  "диабет",
  "жкт",
  "гастрит",
  "беременность",
  "давление",
  "щитовидка",
  "врач",
  "назначил",
  "можно ли принимать",
  "совместимость",
];

const MEDICAL_TOKENS = new Set(["бад", "бады"]);

function matchesMedical(text: string): boolean {
  if (MEDICAL_INCLUDES.some((s) => text.includes(s))) return true;
  const tokens = normalizeForTokens(text);
  return tokens.some((t) => MEDICAL_TOKENS.has(t));
}

export function detectChatIntent(message: string): ChatIntent {
  const text = message.trim().toLowerCase();

  if (!text) return "offtopic";

  if (matchesBoundary(text)) return "boundary";

  if (matchesMedical(text)) return "medical";

  const nutritionWords = [
    "еда",
    "питание",
    "завтрак",
    "обед",
    "ужин",
    "перекус",
    "сладкое",
    "сахар",
    "хочу есть",
    "голод",
    "переел",
    "переела",
    "сорвал",
    "сорвалась",
    "меню",
    "рецепт",
    "что приготовить",
  ];

  const dayWords = [
    "день",
    "сегодня",
    "вечером",
    "ночью",
    "не успел",
    "не успела",
    "мотался",
    "моталась",
    "хаос",
    "на работе",
    "по делам",
  ];

  const wellbeingWords = [
    "устал",
    "устала",
    "стресс",
    "сон",
    "не высп",
    "нет сил",
    "тревожно",
    "плохо",
    "самочувствие",
    "нервы",
  ];

  const offTopicWords = [
    "фильм",
    "сериал",
    "посмотреть",
    "игра",
    "новости",
    "погода",
    "музыка",
  ];

  if (
    offTopicWords.some((w) => text.includes(w)) &&
    !nutritionWords.some((w) => text.includes(w)) &&
    !wellbeingWords.some((w) => text.includes(w))
  ) {
    return "offtopic";
  }

  if (nutritionWords.some((w) => text.includes(w))) return "nutrition";
  if (dayWords.some((w) => text.includes(w))) return "day_reflection";
  if (wellbeingWords.some((w) => text.includes(w))) return "wellbeing";

  return "offtopic";
}

export function buildSoftRedirectMessage(): string {
  return "Я здесь больше про питание, самочувствие и прохождение программы. Давай лучше разберём, что сегодня повлияло на еду или состояние.";
}

export function buildBoundaryMessage(): string {
  return "Я здесь, чтобы помочь с питанием, самочувствием и прохождением программы. Давай лучше разберём, что сейчас происходит с днём или едой.";
}

/** Текст для локальных ответов или напоминаний; маршрутизация чата не заменяет OpenRouter на это сообщение. */
export function buildMedicalSafetyMessage(): string {
  return "Перед применением лучше согласовать это с вашим врачом, особенно если есть диагнозы, анализы или назначенное лечение.";
}
