import type { ClientQuestionnaire } from "../questionnaire";
import { buildPersonalProgram } from "./buildPersonalProgram";
import { explainProgramWithAI } from "./explainProgramWithAI";
import { generateProgramWithAI } from "./generateProgramWithAI";
import { parseFoodConstraints } from "./foodConstraints";
import {
  clearPersonalProgram,
  loadPersonalProgram,
  savePersonalProgram,
  savePersonalProgramExplanation,
} from "./programStorage";
import type { PersonalProgram } from "./types";
import { isBrowserOnline, validatePersonalProgram } from "./validatePersonalProgram";

/** Общий лимит ожидания online-сборки программы (`generateProgramWithAI`). */
const ONLINE_PROGRAM_BUDGET_MS = 30_000;

/** Совпадает с опциями `buildPersonalProgram` (duration 7 | 14 | 30). */
type BuildPersonalProgramOptionsArg = NonNullable<
  Parameters<typeof buildPersonalProgram>[1]
>;

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
 * — при невалидном кэше кеш очищается и выполняется новая сборка;
 * — локальный план и ответ AI сохраняются только если валидация прошла;
 * — online: запрос полного плана с бюджетом до 30 с; при успехе — AI-план после проверки;
 * — иначе локальный fallback.
 * Объяснение программы запрашивается в фоне и не блокирует возврат плана.
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

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    return persistProgramIfValid(baseProgram, constraints);
  }

  if (!isBrowserOnline()) {
    return persistProgramIfValid(baseProgram, constraints);
  }

  try {
    const aiProgram = await Promise.race([
      generateProgramWithAI(questionnaire, baseProgram, apiKey),
      new Promise<PersonalProgram | null>((resolve) => {
        setTimeout(() => resolve(null), ONLINE_PROGRAM_BUDGET_MS);
      }),
    ]);

    if (
      aiProgram != null &&
      validatePersonalProgram(aiProgram, aiProgram.totalDays, constraints)
    ) {
      savePersonalProgram(aiProgram);
      schedulePersistExplanation(aiProgram, questionnaire, apiKey);
      return aiProgram;
    }

    const local = persistProgramIfValid(baseProgram, constraints);
    if (validatePersonalProgram(local, local.totalDays, constraints)) {
      schedulePersistExplanation(local, questionnaire, apiKey);
    }
    return local;
  } catch {
    const local = persistProgramIfValid(baseProgram, constraints);
    if (validatePersonalProgram(local, local.totalDays, constraints)) {
      schedulePersistExplanation(local, questionnaire, apiKey);
    }
    return local;
  }
}
