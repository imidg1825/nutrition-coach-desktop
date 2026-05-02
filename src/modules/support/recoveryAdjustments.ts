import type { ProgramDay } from "../programBuilder/types";
import { isRecoveryActive, type RecoveryState } from "./recoveryMode";

function appendSoftSuffix(base: string): string {
  const trimmed = base.trim();
  const softSuffix = "Сегодня можно мягче: один посильный шаг уже хорошо.";
  if (trimmed.length === 0) return softSuffix;
  if (trimmed.includes(softSuffix)) return trimmed;
  return `${trimmed} ${softSuffix}`;
}

function softenTask(base: string): string {
  const trimmed = base.trim();
  if (trimmed.length === 0) {
    return "Сделайте один простой шаг по плану, без перегруза.";
  }
  if (trimmed.length > 80) {
    const firstSentence = trimmed.split(/[.!?]/)[0]?.trim();
    const firstPart =
      firstSentence && firstSentence.length > 0
        ? firstSentence
        : `${trimmed.slice(0, 80).trim()}...`;
    return `${firstPart}. Сделайте только один простой шаг.`;
  }
  return `${trimmed} Достаточно одного простого действия.`;
}

function softenFocus(): string {
  return "Спокойный ритм без попытки сделать идеально.";
}

function appendSimpleMealsHint(base: string): string {
  const trimmed = base.trim();
  const hint = "Сегодня можно проще: выбирайте самые простые варианты блюд.";
  if (trimmed.length === 0) return hint;
  if (trimmed.includes(hint)) return trimmed;
  return `${trimmed} ${hint}`;
}

export function applyRecoveryToProgramDay(
  day: ProgramDay,
  recoveryState: RecoveryState | null,
): ProgramDay {
  if (!isRecoveryActive(recoveryState)) return day;

  return {
    ...day,
    supportMessage: appendSoftSuffix(day.supportMessage),
    task: softenTask(day.task),
    focus: softenFocus(),
    meals: Array.isArray(day.meals)
      ? day.meals.map((meal) => ({
          ...meal,
          cooking: appendSimpleMealsHint(meal.cooking),
        }))
      : day.meals,
  };
}
