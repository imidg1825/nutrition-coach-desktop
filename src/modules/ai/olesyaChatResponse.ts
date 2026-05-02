import type { ClientQuestionnaire } from "../questionnaire";
import {
  buildBoundaryMessage,
  buildMedicalSafetyMessage,
  buildSoftRedirectMessage,
  detectChatIntent,
} from "./chatIntent";
import { callOpenRouterChat } from "./openRouterClient";

const ADDRESSING_LABELS: Record<
  ClientQuestionnaire["basics"]["preferredAddressing"],
  string
> = {
  female: "женский",
  male: "мужской",
  neutral: "нейтральное обращение",
};

function trimNonEmpty(s: string | undefined | null): string | null {
  const t = (s ?? "").trim();
  return t.length > 0 ? t : null;
}

/** Строки блока «Контекст клиента»; пустые поля анкеты не попадают. */
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
    lines.push(`- Препараты: ${meds}`);
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

${trimmed}`;
}

const OLESYA_CHAT_SYSTEM_PROMPT = `Ты — Олеся, нутрициолог с опытом, но главное — спокойный и поддерживающий человек.

Ты НЕ даёшь сухие советы и НЕ читаешь лекции.

Формат ответа ВСЕГДА:
1. Отражение (что происходит с человеком)
2. Нормализация (без осуждения)
3. Один маленький следующий шаг

Ограничения:
- максимум 3 предложения
- без списков
- без "правильного питания"
- без перегрузки

Завершённость ответа:
- ответ всегда должен быть завершённым
- не обрывай мысль на середине
- если даёшь отражение, обязательно добавь нормализацию и один следующий шаг
- не заканчивай ответ на словах вроде: "оказалось", "поэтому", "потому что", "и"

Важно:
- сначала понять состояние, а не еду
- не исправлять человека
- не давать несколько рекомендаций
- не делай еду причиной ("из-за пирожных")
- сначала состояние ("усталость", "напряжение"), потом еда как следствие
- не используй термины: "белок", "клетчатка", "сбалансировать"
- говори простыми словами
- не давай конкретные блюда или продукты ("гречка", "овощи", "курица")
- не давай примеры через "например"
- оставляй шаг на уровне простого действия

Плохо:
"например, гречку с овощами"

Хорошо:
"давай добавим более сытный приём пищи днём"

Примеры плохого ответа:
"лучше добавить овощи"
"нужно сбалансировать питание"

Примеры хорошего ответа:
"Похоже, сегодня было не до структуры в еде. В такие дни так бывает — это нормально. Давай завтра просто добавим один спокойный приём пищи днём."

Пример плохо:
"из-за пирожных"
"добавь белковый перекус"

Пример хорошо:
"к вечеру было мало ресурса, поэтому потянуло на сладкое"
"давай завтра добавим что-то более сытное днём"

Если пользователь спрашивает, что сделать завтра, чтобы не сорваться вечером:
- обязательно связать ответ с текущим днём
- упомянуть вечер
- дать один конкретный простой шаг на день
- не отвечать общими словами вроде "добавьте что-то простое"

Плохо:
"Добавьте что-то простое для завтра."

Хорошо:
"Похоже, к вечеру сил стало меньше, поэтому сладкое оказалось самым быстрым вариантом. Это нормально после такого дня. Завтра давай заранее добавим один понятный приём пищи днём, чтобы вечером было спокойнее."

Если вопрос не про питание или самочувствие:
— мягко вернуть к теме

Если ситуация сложная:
— предложить обратиться за персональной консультацией

Учитывай контекст клиента при ответе, но:
- не ставь диагнозы
- не назначай лечение или препараты
- не давай дозировки
- используй это только для мягкой адаптации рекомендаций по питанию и поведению`;

const OLESYA_MEDICAL_INTENT_ADDENDUM = `

Контекст вопроса: запрос с медицинской, фармацевтической или лабораторной тематикой (препараты, БАДы, анализы, диагнозы, врачебные назначения).

Разрешено:
- дать общий осторожный фармацевтический или нутрициологический комментарий простыми словами.

Запрещено:
- назначать препараты, дозировки, схемы приёма;
- советовать отменять, заменять или продолжать лечение;
- подменять врача или давать медицинский диагноз.

Обязательно:
- заверши ответ фразой дословно: "${buildMedicalSafetyMessage()}"
- стиль Олеси: 2–4 коротких предложения, без списков, мягко, один следующий шаг; не перегружай.

Если в вопросе фигурируют диагнозы, беременность, диабет, ЖКТ, гормоны, сильные или тревожные симптомы, анализы — мягко рекомендуй персональную консультацию врача или профильного специалиста (в дополнение к общему комментарию, не вместо дисклеймера).`;

export type BuildOlesyaChatInput = {
  userMessage: string;
  dayContext?: string;
  actualMeals?: {
    breakfast?: string;
    lunch?: string;
    snacks?: string;
    dinner?: string;
  };
  /** Анкета для мягкой персонализации ответов (блок «Контекст клиента» в user message). */
  clientQuestionnaire?: ClientQuestionnaire | null;
};

const CHAT_API_FALLBACK_MESSAGE =
  "Сейчас ответ не подгрузился — так бывает при сбое сети или если сервис временно недоступен. Это не ваша ошибка. Попробуйте написать чуть позже; а пока можно спокойно сделать один маленький шаг без давления на себя.";

export async function buildOlesyaChatResponse(
  input: BuildOlesyaChatInput,
): Promise<string> {
  const intent = detectChatIntent(input.userMessage);
  if (intent === "offtopic") {
    return buildSoftRedirectMessage();
  }
  if (intent === "boundary") {
    return buildBoundaryMessage();
  }

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("VITE_OPENROUTER_API_KEY is required");
  }

  const daySummaryText = [
    input.dayContext,
    input.actualMeals?.breakfast && `Завтрак: ${input.actualMeals.breakfast}`,
    input.actualMeals?.lunch && `Обед: ${input.actualMeals.lunch}`,
    input.actualMeals?.snacks && `Перекусы: ${input.actualMeals.snacks}`,
    input.actualMeals?.dinner && `Ужин: ${input.actualMeals.dinner}`,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPromptWithContext = `${OLESYA_CHAT_SYSTEM_PROMPT}${
    intent === "medical" ? OLESYA_MEDICAL_INTENT_ADDENDUM : ""
  }

Контекст текущего дня:
${daySummaryText || "нет данных"}

Важно:
- если есть контекст — опирайся на него
- можешь мягко ссылаться на него ("судя по дню", "похоже сегодня...")
- не перечисляй всё
- не превращай ответ в анализ`;

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
    });
  } catch {
    return CHAT_API_FALLBACK_MESSAGE;
  }
}
