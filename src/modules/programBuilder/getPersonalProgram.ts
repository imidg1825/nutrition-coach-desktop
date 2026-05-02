import type { ClientQuestionnaire } from "../questionnaire";
import { adaptProgramWithAI } from "./adaptProgramWithAI";
import { buildPersonalProgram } from "./buildPersonalProgram";
import { explainProgramWithAI } from "./explainProgramWithAI";
import {
  loadPersonalProgram,
  savePersonalProgram,
  savePersonalProgramExplanation,
} from "./programStorage";
import type { PersonalProgram } from "./types";

/** Совпадает с опциями `buildPersonalProgram` (duration 7 | 14 | 30). */
type BuildPersonalProgramOptionsArg = NonNullable<
  Parameters<typeof buildPersonalProgram>[1]
>;

/**
 * Единая точка получения персональной программы: кэш, детерминированная сборка
 * и опциональная AI-адаптация при наличии ключа OpenRouter.
 */
export async function getPersonalProgram(
  questionnaire: ClientQuestionnaire,
  options?: BuildPersonalProgramOptionsArg,
): Promise<PersonalProgram> {
  const cached = loadPersonalProgram();
  if (cached) {
    if (import.meta.env.DEV) {
      console.info("[getPersonalProgram] cache hit");
    }
    return cached;
  }

  if (import.meta.env.DEV) {
    console.info("[getPersonalProgram] cache miss");
  }

  const baseProgram = buildPersonalProgram(questionnaire, options);

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim();
  if (import.meta.env.DEV) {
    console.info("[getPersonalProgram] hasApiKey:", Boolean(apiKey));
  }

  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.info(
        "[getPersonalProgram] save nutrition.personalProgram (baseProgram, no AI)",
      );
      console.info("[getPersonalProgram] called adaptProgramWithAI:", false);
    }
    savePersonalProgram(baseProgram);
    return baseProgram;
  }

  if (import.meta.env.DEV) {
    console.info("[getPersonalProgram] called adaptProgramWithAI:", true);
  }

  try {
    const adapted = await adaptProgramWithAI(
      baseProgram,
      questionnaire,
      apiKey,
    );
    if (import.meta.env.DEV) {
      console.info(
        "[getPersonalProgram] adapted === baseProgram:",
        adapted === baseProgram,
      );
      console.info(
        "[getPersonalProgram] save nutrition.personalProgram (adapted)",
      );
    }
    savePersonalProgram(adapted);
    const explanation = await explainProgramWithAI(
      adapted,
      questionnaire,
      apiKey,
    );
    if (explanation) {
      savePersonalProgramExplanation(explanation);
    }
    return adapted;
  } catch {
    if (import.meta.env.DEV) {
      console.info(
        "[getPersonalProgram] save nutrition.personalProgram (baseProgram, AI error)",
      );
    }
    savePersonalProgram(baseProgram);
    const explanation = await explainProgramWithAI(
      baseProgram,
      questionnaire,
      apiKey,
    );
    if (explanation) {
      savePersonalProgramExplanation(explanation);
    }
    return baseProgram;
  }
}
