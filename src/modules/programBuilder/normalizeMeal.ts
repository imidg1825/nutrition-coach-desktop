import type { UserFoodConstraints } from "./foodConstraints";
import { buildLunchFields, buildMealFieldsConsistent, type MealFieldContext } from "./mealFields";
import type { PersonalProgram, ProgramMeal } from "./types";

const EMPTY_CONSTRAINTS: UserFoodConstraints = {
  lactose: false,
  gluten: false,
  egg: false,
  nuts: false,
  fish: false,
  seaFish: false,
  riverFish: false,
  seafood: false,
  meat: false,
  excludedPhrases: [],
};

/** Маркеры первого блюда «супового» обеда (борщ/щи считаем супом по смыслу). */
const SOUP_MARKERS = [
  "суп",
  "борщ",
  "солянка",
  "щи",
  "уха",
  "харчо",
  "бульон",
];

export function dishLooksLikeSoup(dish: string): boolean {
  const d = dish.toLowerCase();
  return SOUP_MARKERS.some((m) => d.includes(m));
}

function mealFieldContextFromMeal(
  _meal: ProgramMeal,
  dayIndex = 0,
  userConstraints: UserFoodConstraints = EMPTY_CONSTRAINTS,
): MealFieldContext {
  return {
    hasLactoseIntolerance: userConstraints.lactose,
    userConstraints,
    restrictionsInNutritionRules: true,
    dayIndex,
  };
}

/**
 * Собирает согласованные portion / cooking / replacement для обеда по названию блюда.
 * @deprecated Используйте buildLunchFields из mealFields; оставлено для совместимости сигнатуры.
 */
export function buildLunchFieldsConsistent(args: {
  dish: string;
  proteinSource: string;
  proteinPhrase: string;
  cookingSuffix: string;
  sugarSuffix: string;
}): Pick<ProgramMeal, "portion" | "cooking" | "replacement"> {
  return buildLunchFields(args.dish, {
    hasLactoseIntolerance: false,
    userConstraints: EMPTY_CONSTRAINTS,
    restrictionsInNutritionRules: true,
    dayIndex: 0,
  });
}

/**
 * После изменения dish (в т.ч. AI) пересобирает поля приёма пищи.
 */
export function normalizeLunchMealAfterDishChange(meal: ProgramMeal): ProgramMeal {
  return normalizeMealFields(meal);
}

export function normalizeProgramAfterDishPatches(
  program: PersonalProgram,
  userConstraints: UserFoodConstraints = EMPTY_CONSTRAINTS,
): PersonalProgram {
  return {
    ...program,
    days: program.days.map((day) => ({
      ...day,
      meals: day.meals.map((m) =>
        normalizeMealFields(m, day.dayNumber - 1, userConstraints),
      ),
    })),
  };
}

function normalizeMealFields(
  meal: ProgramMeal,
  dayIndex = 0,
  userConstraints: UserFoodConstraints = EMPTY_CONSTRAINTS,
): ProgramMeal {
  const ctx = mealFieldContextFromMeal(meal, dayIndex, userConstraints);
  const next = buildMealFieldsConsistent(meal.type, meal.dish, ctx);
  return {
    ...meal,
    dish: next.dish,
    portion: next.portion,
    cooking: next.cooking,
    replacement: next.replacement,
  };
}
