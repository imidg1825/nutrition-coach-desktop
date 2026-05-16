export type ChatIntent =
  | "nutrition"
  | "replacement"
  | "day_reflection"
  | "wellbeing"
  | "offtopic"
  | "boundary"
  | "medical"
  | "acute"
  | "eating_disorder";

export const OLESYA_TELEGRAM_HANDLE = "@Olesya_nutrifarma";

/** Фраза эскалации в Telegram для сложных и медицинских вопросов. */
export function buildTelegramEscalationLine(): string {
  return `Напишите мне в Telegram (${OLESYA_TELEGRAM_HANDLE}), чтобы я посмотрела контекст лично.`;
}

/** Подстроки и фразы: сексуальное/провокационное/агрессивное. */
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

const ACUTE_INCLUDES = [
  "боль в груди",
  "давит в груди",
  "обморок",
  "сильная одышка",
  "не могу дышать",
  "сильная слабость",
  "сильное головокружение",
  "кружится голова и боль",
  "многократная рвота",
  "рвота кров",
  "кровь в",
  "резкое ухудшение",
  "сильная аллергическая",
  "отёк лица",
  "отек лица",
  "отёк губ",
  "отек губ",
  "не могу глотать",
  "судороги",
];

const EATING_DISORDER_INCLUDES = [
  "рпп",
  "компульсив",
  "вызываю рвоту",
  "вызывала рвоту",
  "срываюсь и рвот",
  "набуха",
  "заедаю стресс",
  "не контролирую еду",
  "булими",
  "анорекс",
];

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
  "тахикард",
  "беременность",
  "давление",
  "щитовидка",
  "врач",
  "назначил",
  "можно ли принимать",
  "совместимость",
  "дозировк",
  "сколько пить",
  "сколько принимать",
];

const MEDICAL_TOKENS = new Set(["бад", "бады"]);

const REPLACEMENT_WORDS = [
  "замен",
  "замени",
  "заменить",
  "вместо",
  "не подходит",
  "не ем",
  "не ест",
  "чем заменить",
  "не хочу",
  "не могу есть",
  "тошнит от",
  "аллерг",
  "непереносим",
];

const NUTRITION_WORDS = [
  "еда",
  "питание",
  "питаться",
  "завтрак",
  "обед",
  "ужин",
  "перекус",
  "сладк",
  "сахар",
  "тяга",
  "хочу есть",
  "голод",
  "переел",
  "переела",
  "сорвал",
  "сорвалась",
  "меню",
  "рецепт",
  "что приготовить",
  "что купить",
  "купить",
  "блюдо",
  "продукт",
  "план",
  "рацион",
];

const DAY_WORDS = [
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

const WELLBEING_WORDS = [
  "устал",
  "устала",
  "усталость",
  "стресс",
  "сон",
  "не высп",
  "нет сил",
  "тревож",
  "плохо",
  "самочувствие",
  "нервы",
  "тошнит",
  "тошнота",
  "кружится",
  "головокруж",
];

const OFF_TOPIC_WORDS = [
  "фильм",
  "сериал",
  "посмотреть",
  "игра",
  "новости",
  "погода",
  "музыка",
  "курс доллара",
  "политик",
];

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

function matchesAcute(text: string): boolean {
  return ACUTE_INCLUDES.some((s) => text.includes(s));
}

function matchesEatingDisorder(text: string): boolean {
  return EATING_DISORDER_INCLUDES.some((s) => text.includes(s));
}

function matchesMedical(text: string): boolean {
  if (MEDICAL_INCLUDES.some((s) => text.includes(s))) return true;
  const tokens = normalizeForTokens(text);
  return tokens.some((t) => MEDICAL_TOKENS.has(t));
}

function hasNutritionSignal(text: string): boolean {
  return (
    NUTRITION_WORDS.some((w) => text.includes(w)) ||
    REPLACEMENT_WORDS.some((w) => text.includes(w)) ||
    DAY_WORDS.some((w) => text.includes(w)) ||
    WELLBEING_WORDS.some((w) => text.includes(w))
  );
}

export function detectChatIntent(message: string): ChatIntent {
  const text = message.trim().toLowerCase();

  if (!text) return "offtopic";

  if (matchesBoundary(text)) return "boundary";

  if (matchesAcute(text)) return "acute";

  if (matchesEatingDisorder(text)) return "eating_disorder";

  if (matchesMedical(text)) return "medical";

  if (
    OFF_TOPIC_WORDS.some((w) => text.includes(w)) &&
    !hasNutritionSignal(text)
  ) {
    return "offtopic";
  }

  if (REPLACEMENT_WORDS.some((w) => text.includes(w))) return "replacement";
  if (NUTRITION_WORDS.some((w) => text.includes(w))) return "nutrition";
  if (DAY_WORDS.some((w) => text.includes(w))) return "day_reflection";
  if (WELLBEING_WORDS.some((w) => text.includes(w))) return "wellbeing";

  return "nutrition";
}

export function buildSoftRedirectMessage(): string {
  return "Я здесь про питание, самочувствие и прохождение программы. Давай разберём, что сегодня повлияло на еду или состояние — или спросите про блюдо из плана дня.";
}

export function buildBoundaryMessage(): string {
  return "Я здесь, чтобы помочь с питанием, самочувствием и прохождением программы. Давай разберём, что сейчас происходит с днём или едой.";
}

export function buildMedicalSafetyMessage(): string {
  return "Перед применением лучше согласовать это с вашим врачом, особенно если есть диагнозы, анализы или назначенное лечение.";
}

/** Локальный ответ при острых симптомах — без ожидания API. */
export function buildAcuteEscalationMessage(): string {
  return `Это звучит серьёзно — при таких симптомах важно не откладывать: обратитесь за медицинской помощью срочно (скорая или ближайший врач). Когда станет безопаснее, напишите мне в Telegram (${OLESYA_TELEGRAM_HANDLE}), чтобы я посмотрела контекст лично.`;
}
