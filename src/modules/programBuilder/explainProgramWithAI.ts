import {
  callOpenRouterChat,
  OPEN_ROUTER_PROGRAM_TIMEOUT_MS,
} from "../ai/openRouterClient";
import type { PersonalProgram } from "./types";
import type { ClientQuestionnaire } from "../questionnaire";

export async function explainProgramWithAI(
  program: PersonalProgram,
  questionnaire: ClientQuestionnaire,
  apiKey: string,
): Promise<string | null> {
  try {
    const systemContent = `
Ты нутрициолог Олеся.

Объясни клиенту, почему для него составлена такая программа питания.

Важно:
- коротко (2–4 предложения)
- простым языком
- без терминов (не использовать "белки", "углеводы", "клетчатка")
- упомяни:
  - уровень активности
  - цель (если есть)
  - почему такие блюда
- стиль: заботливый, как персональный специалист

Не пиши списки.
Не пиши JSON.
Верни только текст.
`;

    const userContent = `
АНКЕТА:
${JSON.stringify(questionnaire)}

ПРОГРАММА:
${JSON.stringify(program)}
`;

    const content = await callOpenRouterChat({
      apiKey,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
      timeoutMs: OPEN_ROUTER_PROGRAM_TIMEOUT_MS,
    });

    if (!content || typeof content !== "string") {
      return null;
    }

    return content.trim();
  } catch {
    return null;
  }
}
