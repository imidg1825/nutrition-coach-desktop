import type { ClientQuestionnaire } from "../questionnaire";
import { buildPersonalProgram } from "./buildPersonalProgram";
import { loadPersonalProgram, savePersonalProgram } from "./programStorage";
import type { PersonalProgram } from "./types";

/** Совпадает с опциями `buildPersonalProgram` (duration 7 | 14 | 30). */
type BuildPersonalProgramOptionsArg = NonNullable<
  Parameters<typeof buildPersonalProgram>[1]
>;

/**
 * Единая точка получения персональной программы: детерминированная сборка +
 * в будущем — опциональная AI-адаптация при наличии ключа OpenRouter.
 */
export async function getPersonalProgram(
  questionnaire: ClientQuestionnaire,
  options?: BuildPersonalProgramOptionsArg,
): Promise<PersonalProgram> {
  const cached = loadPersonalProgram();
  if (cached) {
    return cached;
  }

  const baseProgram = buildPersonalProgram(questionnaire, options);
  savePersonalProgram(baseProgram);

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return baseProgram;
  }

  // Заглушка: здесь будет вызов адаптации программы через AI (после согласования контракта).
  return baseProgram;
}
