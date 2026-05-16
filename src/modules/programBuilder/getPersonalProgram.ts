import type { ClientQuestionnaire } from "../questionnaire";
import { buildPersonalProgram } from "./buildPersonalProgram";
import { explainProgramWithAI } from "./explainProgramWithAI";
import { parseFoodConstraints } from "./foodConstraints";
import {
  clearPersonalProgram,
  loadPersonalProgram,
  savePersonalProgram,
  savePersonalProgramExplanation,
} from "./programStorage";
import type { PersonalProgram } from "./types";
import { validatePersonalProgram } from "./validatePersonalProgram";

/** Совпадает с опциями `buildPersonalProgram` (duration 7 | 14 | 30). */
type BuildPersonalProgramOptionsArg = NonNullable<
  Parameters<typeof buildPersonalProgram>[1]
>;

// Меню строится локально (programBuilder + catalog). AI не является источником рациона;
// generateProgramWithAI остаётся в проекте, но не вызывается отсюда.
// Объяснения и чат с Олесей — отдельно (explainProgramWithAI и UI-ассистент).

function schedulePersistExplanation(
  program: PersonalProgram,
  questionnaire: ClientQuestionnaire,
  apiKey: string,
): void {
  void explainProgramWithAI(program, questionnaire, apiKey).then((explanation) => {
    if (explanation) {
      savePersonalProgramExplanation(explanation);
    }
  });
}

/**
 * Сохраняем только программу, прошедшую validatePersonalProgram под текущими ограничениями.
 * Невалидная сборка в storage не попадает (кеш очищается).
 */
function persistProgramIfValid(
  program: PersonalProgram,
  constraints: ReturnType<typeof parseFoodConstraints>,
): PersonalProgram {
  const expectedDays = program.totalDays;
  if (validatePersonalProgram(program, expectedDays, constraints)) {
    savePersonalProgram(program);
    return program;
  }
  clearPersonalProgram();
  return program;
}

/**
 * Единая точка получения персональной программы:
 * — кэш в localStorage возвращаем только если он проходит validatePersonalProgram с ограничениями из текущей анкеты;
 * — при невалидном кэше кеш очищается и выполняется новая локальная сборка;
 * — локальный план сохраняется только если валидация прошла;
 * — объяснение программы (не меню) запрашивается в фоне и не блокирует возврат плана.
 */
export async function getPersonalProgram(
  questionnaire: ClientQuestionnaire,
  options?: BuildPersonalProgramOptionsArg,
): Promise<PersonalProgram> {
  const constraints = parseFoodConstraints(questionnaire);

  const cached = loadPersonalProgram();
  if (cached && validatePersonalProgram(cached, cached.totalDays, constraints)) {
    return cached;
  }
  if (cached) {
    clearPersonalProgram();
  }

  const baseProgram = buildPersonalProgram(questionnaire, options);
  const local = persistProgramIfValid(baseProgram, constraints);

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim();
  if (apiKey && validatePersonalProgram(local, local.totalDays, constraints)) {
    schedulePersistExplanation(local, questionnaire, apiKey);
  }

  return local;
}
