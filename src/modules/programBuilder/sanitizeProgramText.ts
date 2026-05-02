import type { PersonalProgram } from "./types";

/** Границы для отдельного слова «белок» (кириллица). */
const BELTOK_WORD = /(^|[^\u0400-\u04FF])белок(?=[^\u0400-\u04FF]|$)/gi;

function sanitizeString(text: string): string {
  let out = text;
  out = out.replace(/источник белка/gi, "курица, рыба или яйцо");
  out = out.replace(/с белком/gi, "с курицей");
  out = out.replace(/сложные углеводы/gi, "гречка, рис или картофель");
  out = out.replace(/клетчатка/gi, "овощи");
  out = out.replace(BELTOK_WORD, (_, before: string) => `${before}курица, рыба или яйцо`);
  return out;
}

export function sanitizeProgramText(program: PersonalProgram): PersonalProgram {
  return {
    ...program,
    nutritionRules: {
      ...program.nutritionRules,
      portionGuidance: sanitizeString(program.nutritionRules.portionGuidance),
      medicalNote:
        program.nutritionRules.medicalNote !== undefined
          ? sanitizeString(program.nutritionRules.medicalNote)
          : undefined,
      restrictions: program.nutritionRules.restrictions.map(sanitizeString),
    },
    days: program.days.map((day) => ({
      ...day,
      meals: day.meals.map((meal) => ({
        ...meal,
        dish: sanitizeString(meal.dish),
        portion: sanitizeString(meal.portion),
        cooking: sanitizeString(meal.cooking),
        replacement: sanitizeString(meal.replacement),
      })),
    })),
  };
}
