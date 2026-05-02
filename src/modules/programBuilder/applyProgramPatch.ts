import type { PersonalProgram } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ProgramPatch = {
  nutritionRules?: Partial<PersonalProgram["nutritionRules"]>;
  replacements?: Array<{
    match: string;
    replaceWith: string;
  }>;
};

export function applyProgramPatch(
  program: PersonalProgram,
  patch: ProgramPatch,
): PersonalProgram {
  const next: PersonalProgram = {
    ...program,
    nutritionRules: {
      ...program.nutritionRules,
      ...(patch.nutritionRules ?? {}),
    },
    days: program.days.map((day) => ({
      ...day,
      meals: day.meals.map((meal) => {
        let dish = meal.dish;

        if (patch.replacements) {
          for (const r of patch.replacements) {
            const matchTrim = r.match.trim();
            const replaceTrim = r.replaceWith.trim();
            if (!matchTrim || !replaceTrim) {
              continue;
            }
            if (dish.toLowerCase().includes(matchTrim.toLowerCase())) {
              dish = dish.replace(
                new RegExp(escapeRegExp(matchTrim), "gi"),
                replaceTrim,
              );
            }
          }
        }

        return {
          ...meal,
          dish,
        };
      }),
    })),
  };

  return next;
}
