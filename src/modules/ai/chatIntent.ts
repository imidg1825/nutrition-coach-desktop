export type ChatIntent =
  | "nutrition"
  | "day_reflection"
  | "wellbeing"
  | "offtopic";

export function detectChatIntent(message: string): ChatIntent {
  const text = message.trim().toLowerCase();

  if (!text) return "offtopic";

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
