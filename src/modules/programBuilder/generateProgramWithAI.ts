import {
  callOpenRouterChat,
  OPEN_ROUTER_PROGRAM_TIMEOUT_MS,
} from "../ai/openRouterClient";
import type { ClientQuestionnaire } from "../questionnaire";
import { normalizeProgramAfterDishPatches } from "./normalizeMeal";
import { sanitizeProgramText } from "./sanitizeProgramText";
import type { PersonalProgram } from "./types";
import { parseFoodConstraints } from "./foodConstraints";
import { validatePersonalProgram } from "./validatePersonalProgram";

/** Вырезает JSON из ответа модели (поддержка ```json … ``` и текста вокруг). */
function extractJsonPayload(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const inner = fenced?.[1]?.trim();
  if (inner && inner.startsWith("{")) {
    return inner;
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

const SYSTEM_PROMPT = `Ты составляешь мягкий персональный план питания на русском языке.

Верни ОДИН JSON-объект строго по схеме PersonalProgram (см. пользовательское сообщение). Без Markdown вокруг JSON, без комментариев, без текста до или после JSON.

Обязательные правила содержания:
- Учитывай анкету: цели, срок программы в днях, ограничения, предпочтения, активность, режим дня, работу, привычки питания.
- Мягкое сопровождение: без давления, без чувства вины, без «диеты как наказание».
- НЕ ставь диагнозы, НЕ назначай лечение и дозировки, НЕ обещай медицинский результат.
- НЕ используй формулировки: «белок», «источник белка», «с белком», «сложные углеводы», «клетчатка» — замени на конкретные продукты (курица, рыба, гречка, овощи и т.д.).
- ЭТАЛОН в user-сообщении — только структура (число дней, типы meal, порядок). НЕ копируй тексты блюд из эталона дословно: перепиши меню под анкету с большим разнообразием.
- Одно и то же основное блюдо (dish) — не чаще 2 раз за любые 14 дней программы.
- Чередуй курицу, индейку, рыбу, яйца, бобовые; если в анкете нет непереносимости лактозы — добавляй молочные: творог, йогурт, кефир, сыр, творожную запеканку/сырники без жарки.
- Если есть непереносимость лактозы — без обычной молочки или только безлактозные аналоги; в dish, portion, cooking и replacement НЕ упоминай творог, йогурт, кефир, сыр, сырники.
- Если непереносимость глютена — без хлеба, тоста, пасты, лапши, макарон (включая replacement).
- Если аллергия на яйцо — без яйца и омлета во всех полях приёма пищи.
- Если аллергия на рыбу — без рыбы и рыбного супа во всех полях.
- Если аллергия на орехи — без орехов и арахисовой пасты.
- Если пользователь не ест мясо — без курицы, индейки, говядины, кролика.
- replacement всегда должен быть безопасной альтернативой: не подставляй запрещённые продукты даже в одном слове.
- Перекусы: НЕ используй печенье, конфеты, сладости как регулярный перекус. Предпочитай: фрукт + йогурт, творог с ягодами, овощи + сыр, кефир, яйцо + овощи, орехи (если нет аллергии).
- Для каждого приёма dish, portion, cooking, replacement согласованы: куриный суп — порция и готовка про курицу/суп, не про рыбу; творог — порция про творог, не «120 г основа + фрукт».
- Каждый день: mood, focus, habit, task, supportMessage — короткие поддерживающие формулировки.
- alternatives: три строки про столовую/вынос/быстрый вариант — по делу и без осуждения.

Структура типов:
- ProgramMeal.type: "breakfast" | "lunch" | "dinner" | "snack" | "secondSnack"
- ProgramMeal: type, title, dish, portion, cooking, replacement — все строки непустые для каждого приёма.
- ProgramDay: dayNumber, mood, focus, habit, task, supportMessage, alternatives { cafeOrCanteen, takeAway, quickOption }, meals[]
- nutritionRules: weightLossGoal boolean, portionGuidance string, medicalNote опционально, restrictions string[]`;

/**
 * Запрашивает у OpenRouter полный PersonalProgram по анкете.
 * Локальный baseProgram задаёт точную структуру дней и приёмов (число дней, типы meal), модель переписывает содержимое.
 */
export async function generateProgramWithAI(
  questionnaire: ClientQuestionnaire,
  baseProgram: PersonalProgram,
  apiKey: string,
): Promise<PersonalProgram | null> {
  try {
    const expectedDays = baseProgram.totalDays;
    const startedAt = baseProgram.startedAt;

    const constraints = parseFoodConstraints(questionnaire);
    const constraintLines: string[] = [];
    if (constraints.lactose) constraintLines.push("лактоза: без молочных продуктов");
    if (constraints.gluten) constraintLines.push("глютен: без хлеба, тоста, пасты, лапши");
    if (constraints.egg) constraintLines.push("яйцо: без яиц и омлетов");
    if (constraints.fish) constraintLines.push("рыба: без рыбы и рыбных блюд");
    if (constraints.nuts) constraintLines.push("орехи: без орехов и арахисовой пасты");
    if (constraints.meat) constraintLines.push("мясо: без курицы, индейки, говядины, кролика");
    if (constraints.excludedPhrases.length > 0) {
      constraintLines.push(
        `дополнительно не есть: ${constraints.excludedPhrases.join(", ")}`,
      );
    }

    const userContent = `АНКЕТА (используй как основу):
${JSON.stringify(questionnaire)}

ОГРАНИЧЕНИЯ ПИТАНИЯ (обязательны во всех dish, portion, cooking, replacement):
${constraintLines.length > 0 ? constraintLines.join("\n") : "нет жёстких ограничений из анкеты"}

ЖЁСТКИЕ ПОЛЯ результата (должны совпасть буквально):
- totalDays: ${expectedDays}
- startedAt: "${startedAt}"

ЭТАЛОН СТРУКТУРЫ (число days = ${expectedDays}; у каждого дня тот же набор meal.type и порядок; тексты блюд и полей — новые, разнообразные, не копируй dish из эталона):
${JSON.stringify(baseProgram)}

Верни один JSON объекта PersonalProgram с полями totalDays, startedAt, nutritionRules, days.`;

    const raw = await callOpenRouterChat({
      apiKey,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      /** Меньше max_tokens — быстрее ответ модели; полный план всё ещё помещается при типичной длине. */
      maxTokens: 6000,
      timeoutMs: OPEN_ROUTER_PROGRAM_TIMEOUT_MS,
    });

    const jsonStr = extractJsonPayload(raw);
    const parsed: unknown = JSON.parse(jsonStr);

    if (parsed === null || typeof parsed !== "object") {
      return null;
    }

    let program = parsed as PersonalProgram;

    program.totalDays = expectedDays;
    program.startedAt = startedAt;

    program = sanitizeProgramText(program);
    program = normalizeProgramAfterDishPatches(program, constraints);

    if (!validatePersonalProgram(program, expectedDays, constraints)) {
      return null;
    }

    return program;
  } catch {
    return null;
  }
}
