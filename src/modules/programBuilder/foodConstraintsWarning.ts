import type { UserFoodConstraints } from "./foodConstraints";

export const FOOD_CONSTRAINTS_WARNING_3_PLUS =
  "У вас указано несколько пищевых ограничений. Перед тем как опираться на этот рацион в повседневности, имеет смысл обсудить его с врачом или специалистом по питанию — так спокойнее и увереннее.";

export const FOOD_CONSTRAINTS_WARNING_5_PLUS =
  "План собран с учётом довольно строгих ограничений. Чтобы питание оставалось разнообразным и полноценным, лучше спокойно согласовать такой формат со специалистом.";

/** Считает группы ограничений для safety-warning (R2). */
export function countFoodConstraintGroups(
  constraints: UserFoodConstraints,
): number {
  let count = 0;
  if (constraints.gluten) count += 1;
  if (constraints.lactose) count += 1;
  if (constraints.egg) count += 1;
  if (constraints.nuts) count += 1;
  if (constraints.meat) count += 1;
  if (constraints.fish || constraints.seaFish || constraints.riverFish) {
    count += 1;
  }
  if (constraints.seafood) count += 1;
  return count;
}

/** 5+ — только сильный текст; 3–4 — мягкий; меньше 3 — null. */
export function getFoodConstraintsWarningMessage(
  constraints: UserFoodConstraints,
): string | null {
  const count = countFoodConstraintGroups(constraints);
  if (count >= 5) return FOOD_CONSTRAINTS_WARNING_5_PLUS;
  if (count >= 3) return FOOD_CONSTRAINTS_WARNING_3_PLUS;
  return null;
}
