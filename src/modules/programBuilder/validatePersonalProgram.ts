import {
  mealTextAllowedForUser,
  textContainsEgg,
  textHasGlutenBread,
  textHasPlainOats,
  textViolatesFishConstraints,
  type UserFoodConstraints,
} from "./foodConstraints";
import { dishLooksLikeSoup } from "./normalizeMeal";
import { mealFieldsConsistentWithDish } from "./mealProtein";
import type { PersonalProgram } from "./types";

function nonEmptyText(s: unknown): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

function validateMealProteinConsistency(
  dish: string,
  portion: string,
  cooking: string,
  replacement: string,
): boolean {
  if (
    !mealFieldsConsistentWithDish(dish, portion, cooking, replacement, "portion")
  ) {
    return false;
  }
  if (
    !mealFieldsConsistentWithDish(dish, portion, cooking, replacement, "cooking")
  ) {
    return false;
  }
  return true;
}

function validateMealAgainstConstraints(
  meal: {
    dish: string;
    portion: string;
    cooking: string;
    replacement: string;
  },
  constraints: UserFoodConstraints,
): boolean {
  const fields = [meal.dish, meal.portion, meal.cooking, meal.replacement];
  if (!fields.every((text) => mealTextAllowedForUser(text, constraints))) {
    return false;
  }
  if (constraints.gluten) {
    if (fields.some((text) => textHasPlainOats(text))) {
      return false;
    }
    if (fields.some((text) => textHasGlutenBread(text))) {
      return false;
    }
  }
  if (constraints.egg && fields.some((text) => textContainsEgg(text))) {
    return false;
  }
  if (fields.some((text) => textViolatesFishConstraints(text, constraints))) {
    return false;
  }
  return true;
}

/**
 * Проверяет целостность плана после локальной сборки или AI-адаптации.
 * Пищевые ограничения (constraints) — только в полях приёмов пищи (meals).
 * R1: portionGuidance, medicalNote, coaching и alternatives не проверяются на еду.
 */
export function validatePersonalProgram(
  program: PersonalProgram,
  expectedTotalDays: number,
  constraints?: UserFoodConstraints,
): boolean {
  if (!program || typeof program !== "object") {
    return false;
  }
  if (program.totalDays !== expectedTotalDays) {
    return false;
  }
  if (!Array.isArray(program.days) || program.days.length !== expectedTotalDays) {
    return false;
  }
  if (
    program.nutritionRules == null ||
    typeof program.nutritionRules !== "object"
  ) {
    return false;
  }
  if (typeof program.nutritionRules.weightLossGoal !== "boolean") {
    return false;
  }
  if (!nonEmptyText(program.nutritionRules.portionGuidance)) {
    return false;
  }
  if (!Array.isArray(program.nutritionRules.restrictions)) {
    return false;
  }
  if (!nonEmptyText(program.startedAt)) {
    return false;
  }

  for (let i = 0; i < program.days.length; i++) {
    const day = program.days[i];
    if (day.dayNumber !== i + 1) {
      return false;
    }
    if (
      !nonEmptyText(day.mood) ||
      !nonEmptyText(day.focus) ||
      !nonEmptyText(day.habit) ||
      !nonEmptyText(day.task) ||
      !nonEmptyText(day.supportMessage)
    ) {
      return false;
    }
    if (!day.alternatives || typeof day.alternatives !== "object") {
      return false;
    }
    const alt = day.alternatives;
    if (
      typeof alt.cafeOrCanteen !== "string" ||
      typeof alt.takeAway !== "string" ||
      typeof alt.quickOption !== "string"
    ) {
      return false;
    }
    if (!Array.isArray(day.meals) || day.meals.length === 0) {
      return false;
    }
    for (const meal of day.meals) {
      if (
        !nonEmptyText(meal.title) ||
        !nonEmptyText(meal.dish) ||
        !nonEmptyText(meal.portion) ||
        !nonEmptyText(meal.cooking) ||
        !nonEmptyText(meal.replacement)
      ) {
        return false;
      }

      const dishLower = meal.dish.toLowerCase();
      if (
        (dishLower.includes("печень") || dishLower.includes("конфет")) &&
        (meal.type === "snack" || meal.type === "secondSnack")
      ) {
        return false;
      }

      if (
        !validateMealProteinConsistency(
          meal.dish,
          meal.portion,
          meal.cooking,
          meal.replacement,
        )
      ) {
        return false;
      }

      if (constraints && !validateMealAgainstConstraints(meal, constraints)) {
        return false;
      }

      if (meal.type === "lunch") {
        const soupDish = dishLooksLikeSoup(meal.dish);
        if (!soupDish && meal.cooking.toLowerCase().includes("суп")) {
          return false;
        }
      }
    }
  }

  return true;
}

/** Браузер сообщает об offline; при отсутствии navigator считаем среду «онлайн». */
export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }
  return navigator.onLine !== false;
}
