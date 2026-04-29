import type { ClientQuestionnaire } from "../questionnaire";
import type { PersonalProgram, ProgramDay, ProgramMeal } from "./types";

type DayTemplate = {
  breakfast: string;
  lunch: string;
  dinner: string;
};

const DAY_TEMPLATES: DayTemplate[] = [
  {
    breakfast: "Овсянка на воде с яблоком",
    lunch: "Гречка с курицей и овощами",
    dinner: "Рыба с овощами",
  },
  {
    breakfast: "Омлет с овощами",
    lunch: "Овощной суп + птица",
    dinner: "Тушёная индейка с овощами",
  },
  {
    breakfast: "Гречневая каша",
    lunch: "Рис с рыбой и салатом",
    dinner: "Курица с овощами",
  },
  {
    breakfast: "Творог или замена",
    lunch: "Лёгкий суп + белок",
    dinner: "Рыба с овощами",
  },
  {
    breakfast: "Овсянка или яйцо",
    lunch: "Булгур с птицей",
    dinner: "Овощное рагу с белком",
  },
  {
    breakfast: "Гречка или омлет",
    lunch: "Суп с курицей",
    dinner: "Рыба или птица",
  },
  {
    breakfast: "Каша с фруктом",
    lunch: "Курица/рыба с гарниром",
    dinner: "Лёгкий ужин с овощами",
  },
];

function includesWord(s: string, word: string): boolean {
  return s.toLowerCase().includes(word);
}

function detectWeightLossGoal(questionnaire: ClientQuestionnaire): boolean {
  const goalText = [
    questionnaire.goalAndDuration.primaryGoal,
    questionnaire.goalAndDuration.desiredOutcome,
  ]
    .join(" ")
    .toLowerCase();
  return (
    goalText.includes("похуд") ||
    goalText.includes("снизить вес") ||
    goalText.includes("минус") ||
    goalText.includes("кг") ||
    goalText.includes("килограмм")
  );
}

function buildPortionGuidance(
  questionnaire: ClientQuestionnaire,
  weightLossGoal: boolean,
): string {
  if (!weightLossGoal) {
    return "Сбалансированные порции, регулярное питание и мягкое улучшение привычек.";
  }
  switch (questionnaire.dayScheduleAndWork.activityLevel) {
    case "низкий":
      return "Умеренные порции, больше овощей и белка, перекусы небольшие.";
    case "средний":
      return "Умеренные порции без жёстких ограничений, акцент на регулярность и качество еды.";
    case "высокий":
      return "Не урезать питание резко: оставить белок, овощи и сложные углеводы.";
  }
}

function meal(
  type: ProgramMeal["type"],
  title: string,
  dish: string,
  portion: string,
  cooking: string,
  replacement: string,
): ProgramMeal {
  return { type, title, dish, portion, cooking, replacement };
}

export function buildPersonalProgram(
  questionnaire: ClientQuestionnaire,
): PersonalProgram {
  const totalDays = questionnaire.goalAndDuration.programDurationDays || 14;
  const startedAt = new Date().toISOString().slice(0, 10);

  const cooking = questionnaire.cookingHabitsAndMethods;
  const mealsPerDay = questionnaire.foodAndProducts.mealsPerDay;
  const snacksAndTiming = questionnaire.foodAndProducts.snacksAndTiming.trim();

  const weightLossGoal = detectWeightLossGoal(questionnaire);
  const hasLactoseIntolerance = includesWord(
    questionnaire.medicalParticularities.intolerances,
    "лактоз",
  );
  const hasNutAllergy = includesWord(
    questionnaire.medicalParticularities.foodAllergies,
    "орех",
  );

  const restrictionText = (
    questionnaire.medicalParticularities.medicalDietaryRestrictions +
    " " +
    questionnaire.medicalParticularities.medicalParticularitiesDescription +
    " " +
    (cooking?.cookingMethodsToAvoid ?? "")
  ).toLowerCase();
  const hasFryingOrFatRestrictions =
    restrictionText.includes("жар") || restrictionText.includes("жирн");
  const shouldAvoidSugar =
    weightLossGoal ||
    (cooking?.sugarAddingFrequency !== undefined &&
      cooking.sugarAddingFrequency !== "no") ||
    (cooking?.sweetDrinksFrequency !== undefined &&
      cooking.sweetDrinksFrequency !== "no");

  const hasMedicalData =
    questionnaire.medicalParticularities.hasMedicalParticularities ||
    [
      questionnaire.medicalParticularities.medicalParticularitiesDescription,
      questionnaire.medicalParticularities.foodAllergies,
      questionnaire.medicalParticularities.intolerances,
      questionnaire.medicalParticularities.medicalDietaryRestrictions,
    ].some((v) => v.trim().length > 0);

  const restrictions: string[] = [];
  if (hasLactoseIntolerance) restrictions.push("исключить продукты с лактозой");
  if (hasNutAllergy) restrictions.push("исключить орехи");
  if (hasFryingOrFatRestrictions)
    restrictions.push("без жареного и жирного, без зажарки");
  if (shouldAvoidSugar) restrictions.push("без сахара и сладких напитков");

  const nutritionRules = {
    weightLossGoal,
    portionGuidance: buildPortionGuidance(questionnaire, weightLossGoal),
    medicalNote: hasMedicalData
      ? "Меню составлено в мягком режиме: без лечебного рациона и с учётом указанных ограничений."
      : undefined,
    restrictions,
  };

  const snackVariants = shouldAvoidSugar
    ? [
        "фрукт или чай без сахара",
        "яйцо и овощи",
        "овощная нарезка и несладкий напиток",
        "фрукт (небольшая порция)",
      ]
    : [
        "фрукт или чай",
        "яйцо и овощи",
        "овощная нарезка и вода",
        "фрукт (небольшая порция)",
      ];

  const days: ProgramDay[] = Array.from({ length: totalDays }, (_, i) => {
    const dayNumber = i + 1;
    const template = DAY_TEMPLATES[i % DAY_TEMPLATES.length];
    const dailySnack = snackVariants[i % snackVariants.length];

    const breakfastDish =
      template.breakfast === "Творог или замена" && hasLactoseIntolerance
        ? "яйцо или каша с фруктом"
        : template.breakfast;

    const cookingSuffix = hasFryingOrFatRestrictions
      ? " Готовить без жарки и жирного."
      : " Базово: варка, тушение или запекание.";
    const sugarSuffix = shouldAvoidSugar
      ? " Без сахара и сладких напитков."
      : "";

    const meals: ProgramMeal[] = [
      meal(
        "breakfast",
        "Завтрак",
        breakfastDish,
        "120-180 г основа + фрукт/овощи",
        `Готовить мягко, без перегруза.${sugarSuffix}${cookingSuffix}`,
        "Омлет с овощами или каша",
      ),
      meal(
        "lunch",
        "Обед",
        template.lunch,
        "Гарнир 120-180 г + белок 100-150 г + овощи 150-250 г",
        `Суп: 250-350 мл. Белок отварить/запечь.${cookingSuffix}`,
        "Рис/гречка/булгур + птица/рыба + овощи",
      ),
      meal(
        "dinner",
        "Ужин",
        template.dinner,
        "Белок 100-150 г + овощи 150-250 г",
        `Лёгкий ужин: тушение/запекание.${cookingSuffix}`,
        "Омлет с овощами или бобовые с овощами",
      ),
    ];

    if (mealsPerDay > 3) {
      const snackDish = snacksAndTiming
        ? `Текущая привычка: ${snacksAndTiming}`
        : dailySnack;
      meals.push(
        meal(
          "snack",
          "Перекус",
          snackDish,
          "Маленькая порция",
          weightLossGoal
            ? `Небольшой перекус без увеличения общего объёма.${sugarSuffix}`
            : `Лёгкий перекус между основными приёмами.${sugarSuffix}`,
          `Мягкая замена: ${dailySnack}`,
        ),
      );
    }

    if (mealsPerDay > 4) {
      meals.push(
        meal(
          "secondSnack",
          "Второй перекус",
          shouldAvoidSugar
            ? "овощи, яйцо или чай без сахара"
            : "овощи, яйцо или чай",
          "Маленькая порция",
          `Небольшой второй перекус без перегруза.${sugarSuffix}`,
          "Фрукт или овощная нарезка",
        ),
      );
    }

    return {
      dayNumber,
      mood: "Спокойный рабочий настрой",
      habit: "Стакан воды утром",
      task: "Добавить овощи к одному приёму пищи",
      supportMessage: "Один выполненный шаг в день уже двигает вас вперёд.",
      meals,
    };
  });

  return {
    totalDays,
    startedAt,
    nutritionRules,
    days,
  };
}

