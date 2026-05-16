import type { ClientQuestionnaire } from "../questionnaire";
import type { ProgramMealType } from "../programBuilder/types";
import {
  buildAcuteEscalationMessage,
  buildBoundaryMessage,
  buildMedicalSafetyMessage,
  buildSoftRedirectMessage,
  buildTelegramEscalationLine,
  detectChatIntent,
} from "./chatIntent";
import { callOpenRouterChat } from "./openRouterClient";

const OPEN_ROUTER_CHAT_TIMEOUT_MS = 18_000;

const ADDRESSING_LABELS: Record<
  ClientQuestionnaire["basics"]["preferredAddressing"],
  string
> = {
  female: "женский",
  male: "мужской",
  neutral: "нейтральное обращение",
};

const MEAL_TYPE_LABELS: Record<ProgramMealType, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
  secondSnack: "Второй перекус",
};

function trimNonEmpty(s: string | undefined | null): string | null {
  const t = (s ?? "").trim();
  return t.length > 0 ? t : null;
}

function buildClientContextLines(q: ClientQuestionnaire): string[] {
  const lines: string[] = [];
  const { basics: b, goalAndDuration: g } = q;
  const mp = q.medicalParticularities;
  const h = q.healthAndAnalyses;
  const hab = q.habitsDifficultiesAndSupport;
  const f = q.foodAndProducts;

  const goalParts = [trimNonEmpty(g.primaryGoal), trimNonEmpty(g.desiredOutcome)].filter(
    Boolean,
  ) as string[];
  if (goalParts.length) {
    lines.push(`- Цель: ${goalParts.join("; ")}`);
  }

  const agePart =
    typeof b.age === "number" && b.age > 0 ? `${b.age} лет` : null;
  const genderPart = ADDRESSING_LABELS[b.preferredAddressing]
    ? `обращение: ${ADDRESSING_LABELS[b.preferredAddressing]}`
    : null;
  const weightPart =
    typeof b.weightKg === "number" && b.weightKg > 0
      ? `вес: ${b.weightKg} кг`
      : null;
  const basicsParts = [agePart, genderPart, weightPart].filter(Boolean);
  if (basicsParts.length) {
    lines.push(`- Возраст: ${basicsParts.join(", ")}`);
  }

  const medParts = [
    trimNonEmpty(mp.medicalParticularitiesDescription),
    trimNonEmpty(mp.foodAllergies),
    trimNonEmpty(mp.intolerances),
    trimNonEmpty(mp.medicalDietaryRestrictions),
    trimNonEmpty(h.healthNotes),
  ].filter(Boolean) as string[];
  if (medParts.length) {
    lines.push(`- Особенности здоровья: ${medParts.join("; ")}`);
  }

  const lab = trimNonEmpty(h.labNotes);
  if (lab) {
    lines.push(`- Анализы: ${lab}`);
  }

  const meds = trimNonEmpty(h.medicationsNotes);
  if (meds) {
    lines.push(`- Препараты (из анкеты): ${meds}`);
  }

  const habitParts = [
    trimNonEmpty(hab.mainChallenges),
    trimNonEmpty(hab.whatOftenGetsInTheWay),
    trimNonEmpty(hab.habitsHinderingProgressNotes),
  ].filter(Boolean) as string[];
  if (habitParts.length) {
    lines.push(`- Привычки и сложности: ${habitParts.join("; ")}`);
  }

  const foodParts = [
    trimNonEmpty(f.favoriteFoods),
    trimNonEmpty(f.foodsNotEaten),
    trimNonEmpty(f.commonNutritionChallenges),
    trimNonEmpty(f.snacksAndTiming),
  ].filter(Boolean) as string[];
  if (foodParts.length) {
    lines.push(`- Питание и предпочтения: ${foodParts.join("; ")}`);
  }

  return lines;
}

function buildUserContentWithClientContext(
  userMessage: string,
  clientQuestionnaire: ClientQuestionnaire | null | undefined,
): string {
  const trimmed = userMessage.trim();
  if (!clientQuestionnaire) return trimmed;

  const ctxLines = buildClientContextLines(clientQuestionnaire);
  if (ctxLines.length === 0) return trimmed;

  return `Контекст клиента:
${ctxLines.join("\n")}

Вопрос:
${trimmed}`;
}

export type OlesyaPlannedMealContext = {
  type: ProgramMealType | string;
  title?: string;
  dish: string;
  portion: string;
  cooking: string;
  replacement: string;
};

export type OlesyaDayPlanContext = {
  dayNumber: number;
  focus?: string;
  habit?: string;
  task?: string;
  supportMessage?: string;
  meals: OlesyaPlannedMealContext[];
};

export type BuildOlesyaChatInput = {
  userMessage: string;
  plannedDay?: OlesyaDayPlanContext | null;
  dayContext?: string;
  actualMeals?: {
    breakfast?: string;
    lunch?: string;
    snacks?: string;
    dinner?: string;
  };
  clientQuestionnaire?: ClientQuestionnaire | null;
};

export const CHAT_UNAVAILABLE_FALLBACK_MESSAGE =
  "Сейчас я не могу ответить через чат — так бывает без связи или если сервис временно недоступен. Если вопрос срочный или про самочувствие, напишите мне в Telegram (@Olesya_nutrifarma), чтобы я посмотрела контекст лично. А по питанию на сегодня можно спокойно ориентироваться на план дня и замены из карточек приёмов пищи.";

const OLESYA_CHAT_SYSTEM_PROMPT = `Ты — Олеся, дипломированный фармацевт и нутрициолог. Отвечаешь мягко, по-человечески, без стыда и давления.

Продукт:
- План питания на день уже собран локально из проверенной базы блюд (не из интернета).
- Ты НЕ генерируешь новый рацион с нуля и НЕ пересобираешь весь план на 7/14/30 дней.
- Можешь помочь разобраться с текущим днём, самочувствием, привычками и заменами.

Стиль:
- 3–6 коротких предложений; для замен можно краткий список из 1–3 пунктов.
- Сначала отрази состояние человека, потом практический шаг.
- Простые слова; без лекций.
- Не используй слова: «срыв», «провал», «нарушение», «вина».
- Не обещай гарантированное похудение или «точный» результат.
- Не ставь диагнозы.

Замены блюд/продуктов:
- Если пишут «не ем X» / «X не подходит» — сначала равноценная белковая замена, если X был белковым (творог, мясо, рыба, яйца, бобовые).
- Первым вариантом бери «Замена» из карточки этого приёма в плане дня, если она подходит под ограничения.
- Овощи, салат, морковь — только как дополнение к основной замене, не вместо белка.
- Всего 1–3 конкретных варианта; учитывай аллергии из анкеты.
- Не пересобирай весь день.

Медицина и БАДы:
- Можно назвать возможные направления для обсуждения (например магний, витамин D, пробиотики) — без назначения курса.
- Запрещены формулировки: «начните принимать», «вам нужно пить», «принимайте», любые дозировки, схемы и длительность.
- Обязательно: подбор зависит от анализов, текущих лекарств, диагнозов и контекста; это не замена врача.
- При диагнозах, лекарствах, тахикардии, гастрите и похожих темах — предложи личный разбор в Telegram.

Сложные ситуации:
- Если вопрос слишком индивидуальный — мягко предложи личный контакт в Telegram.`;

const REPLACEMENT_INTENT_ADDENDUM = `

Контекст: пользователь не ест продукт / просит заменить блюдо.
- Сначала найди в плане дня приём с этим продуктом; если в карточке есть «Замена» — предложи её первой (если безопасно по анкете).
- Если убранный продукт белковый (творог, йогурт, мясо, рыба, яйца, бобовые, сыр) — первый вариант должен быть другой белковой заменой из плана или близкой по смыслу.
- Не предлагай только овощи/салат/морковь как единственную замену белка; овощи — максимум как дополнение.
- 1–3 пункта, конкретные названия из контекста дня; не пересобирай весь день.`;

const MEDICAL_INTENT_ADDENDUM = `

Контекст: препараты, БАДы, витамины, анализы, диагнозы.
- 2–4 предложения: можно перечисить возможные направления для обсуждения (магний, витамин D, пробиотики, омега-3 и т.п.) — как темы, не как назначение.
- Нельзя: «начните принимать», «вам нужно пить», «принимайте»; дозировки; схемы; длительность курса; отмена или замена лечения врача.
- Обязательно скажи, что подбор зависит от анализов, лекарств, диагнозов и общего контекста.
- При диагнозах, постоянных лекарствах, тахикардии, гастрите, ЖКТ, гормонах — мягко предложи: ${buildTelegramEscalationLine()}
- Заверши фразой: «${buildMedicalSafetyMessage()}»`;

const EATING_DISORDER_INTENT_ADDENDUM = `

Контекст: РПП, компульсивное переедание, рвота после еды, потеря контроля над едой.
- Поддержи без осуждения.
- Не давай жёстких диет и «наказаний» за еду.
- Мягко предложи личный разбор: ${buildTelegramEscalationLine()}`;

function buildPlannedDaySummary(
  plannedDay: OlesyaDayPlanContext | null | undefined,
  dayContext: string | undefined,
  actualMeals: BuildOlesyaChatInput["actualMeals"],
): string {
  const lines: string[] = [];

  if (plannedDay) {
    lines.push(`День ${plannedDay.dayNumber} из программы`);
    const coaching = [
      trimNonEmpty(plannedDay.focus) && `Фокус: ${plannedDay.focus}`,
      trimNonEmpty(plannedDay.habit) && `Привычка: ${plannedDay.habit}`,
      trimNonEmpty(plannedDay.task) && `Задание: ${plannedDay.task}`,
      trimNonEmpty(plannedDay.supportMessage) &&
        `Поддержка: ${plannedDay.supportMessage}`,
    ].filter(Boolean) as string[];
    if (coaching.length) {
      lines.push(coaching.join("\n"));
    }
    lines.push("План на день:");
    for (const meal of plannedDay.meals) {
      const label =
        MEAL_TYPE_LABELS[meal.type as ProgramMealType] ??
        meal.title ??
        String(meal.type);
      lines.push(
        [
          `• ${label}: ${meal.dish}`,
          `  Порция: ${meal.portion}`,
          `  Готовка: ${meal.cooking}`,
          meal.replacement ? `  Замена: ${meal.replacement}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }

  const reflection = trimNonEmpty(dayContext);
  if (reflection) {
    lines.push(`Как прошёл день (слова пользователя): ${reflection}`);
  }

  const actualParts = [
    trimNonEmpty(actualMeals?.breakfast) && `Факт — завтрак: ${actualMeals!.breakfast}`,
    trimNonEmpty(actualMeals?.lunch) && `Факт — обед: ${actualMeals!.lunch}`,
    trimNonEmpty(actualMeals?.snacks) && `Факт — перекусы: ${actualMeals!.snacks}`,
    trimNonEmpty(actualMeals?.dinner) && `Факт — ужин: ${actualMeals!.dinner}`,
  ].filter(Boolean) as string[];
  if (actualParts.length) {
    lines.push("Что получилось по факту:\n" + actualParts.join("\n"));
  }

  return lines.length > 0 ? lines.join("\n\n") : "нет данных по текущему дню";
}

function buildIntentAddendum(intent: ReturnType<typeof detectChatIntent>): string {
  if (intent === "replacement") return REPLACEMENT_INTENT_ADDENDUM;
  if (intent === "medical") return MEDICAL_INTENT_ADDENDUM;
  if (intent === "eating_disorder") return EATING_DISORDER_INTENT_ADDENDUM;
  return "";
}

export async function buildOlesyaChatResponse(
  input: BuildOlesyaChatInput,
): Promise<string> {
  const intent = detectChatIntent(input.userMessage);

  if (intent === "boundary") {
    return buildBoundaryMessage();
  }
  if (intent === "acute") {
    return buildAcuteEscalationMessage();
  }
  if (intent === "offtopic") {
    return buildSoftRedirectMessage();
  }

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return CHAT_UNAVAILABLE_FALLBACK_MESSAGE;
  }

  const daySummaryText = buildPlannedDaySummary(
    input.plannedDay,
    input.dayContext,
    input.actualMeals,
  );

  const systemPromptWithContext = `${OLESYA_CHAT_SYSTEM_PROMPT}${buildIntentAddendum(intent)}

Контекст текущего дня (только этот день, не вся программа):
${daySummaryText}

Важно:
- опирайся на план дня и замены из карточек;
- не перечисляй весь день без необходимости;
- не пересобирай программу целиком.`;

  const userContent = buildUserContentWithClientContext(
    input.userMessage,
    input.clientQuestionnaire,
  );

  try {
    return await callOpenRouterChat({
      apiKey,
      messages: [
        { role: "system", content: systemPromptWithContext },
        { role: "user", content: userContent },
      ],
      timeoutMs: OPEN_ROUTER_CHAT_TIMEOUT_MS,
    });
  } catch {
    return CHAT_UNAVAILABLE_FALLBACK_MESSAGE;
  }
}
