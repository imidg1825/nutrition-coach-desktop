import {
  callOpenRouterChat,
  OPEN_ROUTER_PROGRAM_TIMEOUT_MS,
} from "../ai/openRouterClient";
import type { ClientQuestionnaire } from "../questionnaire";
import { applyProgramPatch } from "./applyProgramPatch";
import type { PersonalProgram } from "./types";

export async function adaptProgramWithAI(
  program: PersonalProgram,
  questionnaire: ClientQuestionnaire,
  apiKey: string,
): Promise<PersonalProgram> {
  try {
    const systemContent = `Ты нутрициолог.

Тебе дана анкета клиента и готовая программа питания.

Твоя задача — НЕ переписывать программу, а предложить минимальные изменения в формате JSON-патча.

Структура ответа:

{
  "nutritionRules": { ...опционально },
  "replacements": [
    { "match": "...", "replaceWith": "..." }
  ]
}

Правила:
- НЕ возвращать всю программу
- НЕ менять структуру программы
- НЕ добавлять новые поля кроме указанных
- НЕ давать медицинских назначений и дозировок
- replacements должны быть простыми словами (например: "молоко" → "безлактозное молоко")

Язык меню для клиента (обязательно в патче и в текстах nutritionRules):
- НЕ использовать слова и фразы: "с белком", "белок", "источник белка", "сложные углеводы", "клетчатка".
- Писать конкретные продукты и блюда: курица, индейка, яйцо, рыба, при отсутствии ограничений — творог; гречка, рис, картофель, овощи.
- Плохо: "Овощное рагу с белком". Хорошо: "Овощное рагу с курицей".

Верни ТОЛЬКО JSON без пояснений.`;

    const userContent = `АНКЕТА:
${JSON.stringify(questionnaire)}

ПРОГРАММА:
${JSON.stringify(program)}`;

    const content = await callOpenRouterChat({
      apiKey,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
      timeoutMs: OPEN_ROUTER_PROGRAM_TIMEOUT_MS,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return program;
    }

    if (parsed === null || typeof parsed !== "object") {
      return program;
    }

    return applyProgramPatch(
      program,
      parsed as Parameters<typeof applyProgramPatch>[1],
    );
  } catch {
    return program;
  }
}
