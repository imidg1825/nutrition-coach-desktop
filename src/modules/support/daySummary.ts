import {
  detectUserProfileFromScenarios,
  getDaySummaryInsight,
  getDetectedScenarios,
} from "./behaviorAnalysis";

function buildWhyExplanation(scenarios: string[]): string {
  if (scenarios.length === 0) return "";

  const reasonByScenario: Record<string, string> = {
    overeating:
      "Скорее всего, организму не хватило регулярности или был сильный голод в течение дня.",
    sweetsCraving:
      "Тяга к сладкому часто усиливается из-за усталости или нерегулярного питания.",
    fatigueChaoticDay:
      "Когда день перегружен или нет сил, организм выбирает более простую и быструю еду.",
    eveningSnacking:
      "Вечером сложнее держать структуру питания, особенно если днём были пропуски.",
  };

  const reasons = scenarios
    .map((scenario) => reasonByScenario[scenario])
    .filter((reason): reason is string => Boolean(reason))
    .slice(0, 2);

  if (reasons.length === 0) return "";
  if (reasons.length === 1) return reasons[0];
  return `${reasons[0]} ${reasons[1]}`;
}

const WHY_INTROS = [
  "Похоже, это могло быть связано с тем, что",
  "Возможно, здесь сработало несколько факторов",
  "Скорее всего, день повлиял на питание так",
  "Иногда такое происходит, когда",
  "Это может быть связано с тем, что",
] as const;

function resolveWhyIntroIndex(dayNumber?: number): number {
  if (typeof dayNumber !== "number" || !Number.isFinite(dayNumber) || dayNumber <= 0) {
    return 0;
  }
  const normalizedDay = Math.floor(dayNumber);
  return (normalizedDay - 1) % WHY_INTROS.length;
}

function pickWhyIntroForMessage(message: string, dayNumber?: number): string {
  let index = resolveWhyIntroIndex(dayNumber);
  if (
    message.trimStart().startsWith("Похоже") &&
    WHY_INTROS[index].startsWith("Похоже")
  ) {
    index = (index + 1) % WHY_INTROS.length;
  }
  return WHY_INTROS[index];
}

export function buildDaySummaryMessage(
  deviation: "same" | "less" | "more",
  caloriesDelta: number,
  notes?: string,
  dayNumber?: number,
): string {
  const normalizedNotes = (notes ?? "").trim().toLowerCase();
  const detectedScenarios = getDetectedScenarios(normalizedNotes);
  const userProfile = detectUserProfileFromScenarios(detectedScenarios);
  const whyExplanation = buildWhyExplanation(detectedScenarios);
  const withWhyExplanation = (message: string): string => {
    if (!whyExplanation) return message;

    const intro = pickWhyIntroForMessage(message, dayNumber);

    if (userProfile === "fatigue") {
      return `${message} Судя по дню, у вас было мало ресурса. ${intro}: ${whyExplanation}`;
    }

    return `${message} ${intro}: ${whyExplanation}`;
  };

  const summaryInsight = getDaySummaryInsight(normalizedNotes);
  if (summaryInsight) {
    const softStep =
      summaryInsight.recommendedAction ??
      "Завтра можно выбрать один простой и понятный шаг, без усложнений.";
    return withWhyExplanation(
      `${summaryInsight.explanation} Это нормальная рабочая ситуация. ${softStep}`,
    );
  }

  if (deviation === "less") {
    return withWhyExplanation(
      "Сегодня питания могло быть меньше, чем нужно. Завтра лучше вернуться к более ровному режиму — без жёсткости к себе.",
    );
  }
  if (deviation === "more") {
    return withWhyExplanation(
      "Сегодня могло быть больше еды, чем планировалось. Это не провал — просто завтра возвращаемся к обычному мягкому режиму.",
    );
  }
  if (deviation === "same") {
    return withWhyExplanation(
      "Сегодня получилось довольно стабильно. Такие спокойные дни и создают основу результата.",
    );
  }
  if (caloriesDelta <= -200) {
    return withWhyExplanation(
      "Сегодня питания могло быть меньше, чем нужно. Завтра лучше вернуться к более ровному режиму — без жёсткости к себе.",
    );
  }
  if (caloriesDelta >= 200) {
    return withWhyExplanation(
      "Сегодня могло быть больше еды, чем планировалось. Это не провал — просто завтра возвращаемся к обычному мягкому режиму.",
    );
  }
  return withWhyExplanation(
    "Сегодня получилось довольно стабильно. Такие спокойные дни и создают основу результата.",
  );
}

export function buildTomorrowSuggestion(
  deviation: "same" | "less" | "more",
  caloriesDelta: number,
  notes?: string,
): string {
  const normalizedNotes = (notes ?? "").toLowerCase();
  const hasOvereatingSignal =
    normalizedNotes.includes("переел") ||
    normalizedNotes.includes("переела") ||
    normalizedNotes.includes("сорвал") ||
    normalizedNotes.includes("сорвалась") ||
    normalizedNotes.includes("много") ||
    normalizedNotes.includes("пицца") ||
    normalizedNotes.includes("ролл") ||
    normalizedNotes.includes("бургер") ||
    normalizedNotes.includes("фастфуд") ||
    normalizedNotes.includes("шаурм");
  if (hasOvereatingSignal) {
    return "Завтра просто вернитесь к обычному плану — без разгрузок и попыток компенсировать.";
  }
  const hasSweetsSignal =
    normalizedNotes.includes("сладк") ||
    normalizedNotes.includes("шоколад") ||
    normalizedNotes.includes("печенье") ||
    normalizedNotes.includes("конфет") ||
    normalizedNotes.includes("сахар");
  if (hasSweetsSignal) {
    return "Завтра можно заранее добавить понятный перекус днём, чтобы вечером было спокойнее.";
  }
  const hasEveningSnackingSignal =
    normalizedNotes.includes("вечером") ||
    normalizedNotes.includes("вечер") ||
    normalizedNotes.includes("ночью") ||
    normalizedNotes.includes("ночной") ||
    normalizedNotes.includes("перед сном") ||
    normalizedNotes.includes("перекус") ||
    normalizedNotes.includes("перекусы") ||
    normalizedNotes.includes("доел") ||
    normalizedNotes.includes("доела") ||
    normalizedNotes.includes("дожор");
  if (hasEveningSnackingSignal) {
    return "Завтра попробуйте сделать ужин более спокойным и заранее оставить лёгкий перекус.";
  }
  const hasFatigueSignal =
    normalizedNotes.includes("устал") ||
    normalizedNotes.includes("устала") ||
    normalizedNotes.includes("нет сил") ||
    normalizedNotes.includes("не высп") ||
    normalizedNotes.includes("сон") ||
    normalizedNotes.includes("стресс") ||
    normalizedNotes.includes("нервы") ||
    normalizedNotes.includes("хаос") ||
    normalizedNotes.includes("завал") ||
    normalizedNotes.includes("не успел") ||
    normalizedNotes.includes("не успела");
  if (hasFatigueSignal) {
    return "Завтра выберите самый простой вариант из плана, без стремления сделать всё идеально.";
  }
  const hasNoCookingTimeSignal =
    normalizedNotes.includes("не успел приготовить") ||
    normalizedNotes.includes("не успела приготовить") ||
    normalizedNotes.includes("не готовил") ||
    normalizedNotes.includes("не готовила") ||
    normalizedNotes.includes("ел что было") ||
    normalizedNotes.includes("ела что было") ||
    normalizedNotes.includes("на ходу") ||
    normalizedNotes.includes("взял что было") ||
    normalizedNotes.includes("взяла что было") ||
    normalizedNotes.includes("быстро перекусил") ||
    normalizedNotes.includes("быстро перекусила");
  if (hasNoCookingTimeSignal) {
    return "Завтра можно выбрать самый быстрый вариант еды и не усложнять готовку.";
  }
  if (deviation === "less" || caloriesDelta <= -200) {
    return "Завтра постарайтесь не пропускать основные приёмы пищи.";
  }
  if (deviation === "more" || caloriesDelta >= 200) {
    return "Завтра вернитесь к обычному режиму и не пытайтесь себя наказывать.";
  }
  return "Завтра продолжайте в том же спокойном темпе.";
}
