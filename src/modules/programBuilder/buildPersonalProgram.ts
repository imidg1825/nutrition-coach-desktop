import type { ClientQuestionnaire } from "../questionnaire";
import {
  buildBreakfastFields,
  buildDinnerFields,
  buildLunchFields,
  buildSnackFields,
  type MealFieldContext,
} from "./mealFields";
import type { ProteinKey } from "./mealProtein";
import {
  ensureCatalogPoolSize,
  filterCatalogForConstraints,
} from "./catalogFilter";
import { parseFoodConstraints } from "./foodConstraints";
import {
  BREAKFAST_CATALOG,
  DINNER_CATALOG,
  LUNCH_CATALOG,
  pickDayMenu,
  SNACK_CATALOG,
  type DayMenuHistories,
  type PickHistory,
} from "./menuCatalog";
import type { PersonalProgram, ProgramDay, ProgramMeal } from "./types";

type DayCoachingTemplate = {
  mood: string;
  focus: string;
  habit: string;
  task: string;
  supportMessage: string;
};

type DayAlternativeTemplate = {
  cafeOrCanteen: string;
  takeAway: string;
  quickOption: string;
};

const DAY_COACHING_TEMPLATES: DayCoachingTemplate[] = [
  {
    mood: "Спокойный старт и рабочий ритм",
    focus: "Регулярные приемы пищи без пропусков",
    habit: "Стакан воды утром после пробуждения",
    task: "Добавить овощи минимум к одному основному приему пищи",
    supportMessage: "Достаточно одного устойчивого шага за день, чтобы двигаться дальше.",
  },
  {
    mood: "Ровный темп и внимание к самочувствию",
    focus: "Соблюдать интервалы между приемами пищи",
    habit: "Планировать перекус заранее, если день загружен",
    task: "На обед или ужин выберите простую еду из обычных продуктов и добавьте овощи.",
    supportMessage: "Небольшая последовательность работает лучше, чем резкие изменения.",
  },
  {
    mood: "Уверенный и спокойный день",
    focus: "Больше простых домашних блюд",
    habit: "Готовить с запасом на 1 дополнительный прием пищи",
    task: "Выбрать способ готовки без лишнего масла",
    supportMessage: "Гибкость в меню - это нормально, важна общая структура дня.",
  },
  {
    mood: "Мягкое продолжение без перегруза",
    focus: "Поддерживать комфортные порции",
    habit: "Начинать прием пищи не спеша",
    task: "Сделать ужин легче по объёму: курица, индейка или яйца и немного овощей",
    supportMessage: "Даже при плотном графике можно сохранить базовые привычки.",
  },
  {
    mood: "Стабильный ритм и внимание к деталям",
    focus: "Следить за напитками в течение дня",
    habit: "Держать под рукой воду или несладкий напиток",
    task: "Заменить один случайный перекус на более нейтральный вариант",
    supportMessage: "Постепенные замены обычно легче удерживать в долгую.",
  },
  {
    mood: "Спокойный день с акцентом на регулярность",
    focus: "Поддерживать понятный режим питания",
    habit: "Планировать завтрак с вечера",
    task: "На обед или ужин соберите простую тарелку: индейка с рисом и тёплыми овощами",
    supportMessage: "Если что-то не идеально, достаточно вернуться к плану со следующего приема пищи.",
  },
  {
    mood: "Завершение недели в комфортном темпе",
    focus: "Сохранить баланс без строгих ограничений",
    habit: "Оставлять удобный запас продуктов на следующий день",
    task: "Отметить, какие блюда лучше всего подходят вашему графику",
    supportMessage: "Ваши наблюдения по дню - полезная основа для следующей недели.",
  },
];

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
      return "Умеренные порции: больше овощей, курицы, индейки или яиц, перекусы небольшие.";
    case "средний":
      return "Умеренные порции без жёстких ограничений, акцент на регулярность и качество еды.";
    case "высокий":
      return "Не урезать питание резко: курица, индейка, яйца, овощи, гречка, рис или картофель.";
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

const DAY_ALTERNATIVE_TEMPLATES: DayAlternativeTemplate[] = [
  {
    cafeOrCanteen:
      "Если обед только в столовой, подойдут овощной суп и куриная котлета с гречкой или рис с курицей и салат.",
    takeAway: "",
    quickOption: "",
  },
  {
    cafeOrCanteen:
      "Если день в разъездах, подойдут овощной суп с куриной котлетой и гречкой или салат с рисом и индейкой.",
    takeAway: "В дорогу можно взять сэндвич + яйцо + фрукт.",
    quickOption: "",
  },
  {
    cafeOrCanteen: "Если день поехал и обед сорвался - это ок.",
    takeAway:
      "Достаточно взять суп из магазина, готовый салат и кусок хлеба.",
    quickOption: "",
  },
  {
    cafeOrCanteen:
      "Если заказали пиццу или роллы - это ок, просто не доедайте через силу и вернитесь к обычному ритму дальше.",
    takeAway: "",
    quickOption: "Ничего страшного, если сегодня не идеально.",
  },
  {
    cafeOrCanteen:
      "Если берёте доставку, можно заказать овощной суп, рис с курицей и салат из свежих овощей.",
    takeAway:
      "Если был кофе с чем-то сладким — просто продолжайте день как обычно, в следующий приём пищи возьмите яйцо, сыр или салат.",
    quickOption: "",
  },
  {
    cafeOrCanteen:
      "Если ужин в гостях или в ресторане, выбирайте то, что нравится, без перегруза.",
    takeAway: "Утром за пару минут можно собрать бутерброд, овощи и кефир.",
    quickOption: "",
  },
  {
    cafeOrCanteen:
      "Если обед в офисе на бегу, можно взять сэндвич, сыр, овощи и чай.",
    takeAway: "",
    quickOption: "Если выбора нет - берите что есть. Сегодня можно проще.",
  },
  {
    cafeOrCanteen:
      "Когда на обед только кофе, можно добавить к нему перекус: бутерброд + яйцо или ролл + чай.",
    takeAway: "",
    quickOption:
      "Если день развалился, это нормально - просто выберите один спокойный прием пищи и идите дальше.",
  },
  {
    cafeOrCanteen:
      "Если выбора мало, возьмите овощной суп и гречку с куриной котлетой или рис с тушёной индейкой.",
    takeAway: "",
    quickOption: "Если времени нет вообще (2 минуты), подойдёт кефир, банан и вода.",
  },
  {
    cafeOrCanteen:
      "Если выбираете доставку, берите салат и рис с тушёной индейкой или овощной суп с курицей.",
    takeAway:
      "Если готовить утром некогда, выручат остатки с вчера или готовые блюда из кулинарии.",
    quickOption: "",
  },
  {
    cafeOrCanteen:
      "Если встречи до вечера, в кафе подойдут овощной суп с курицей или салат с гречкой и овощами.",
    takeAway: "На такой день берите еду с собой: контейнер и небольшой перекус.",
    quickOption: "Ничего страшного, если не идеально.",
  },
  {
    cafeOrCanteen:
      "Если съели сладкое, это ок: в следующий приём пищи подойдут овощной суп, салат или рис с курицей и овощами.",
    takeAway:
      "Подойдёт формат 'что есть дома': остатки ужина, бутерброд, овощи или готовая еда.",
    quickOption: "",
  },
];

type BuildPersonalProgramOptions = {
  duration?: 7 | 14 | 30;
};

function normalizeDuration(value: unknown): 7 | 14 | 30 | undefined {
  return value === 7 || value === 14 || value === 30 ? value : undefined;
}

export function buildPersonalProgram(
  questionnaire: ClientQuestionnaire,
  options?: BuildPersonalProgramOptions,
): PersonalProgram {
  const questionnaireDuration = normalizeDuration(
    (
      questionnaire as ClientQuestionnaire & {
        duration?: unknown;
      }
    ).duration,
  );
  const questionnaireProgramDuration = normalizeDuration(
    questionnaire.goalAndDuration.programDurationDays,
  );
  const totalDays =
    normalizeDuration(options?.duration) ??
    questionnaireDuration ??
    questionnaireProgramDuration ??
    14;
  const startedAt = new Date().toISOString().slice(0, 10);

  const cooking = questionnaire.cookingHabitsAndMethods;
  const mealsPerDay = questionnaire.foodAndProducts.mealsPerDay;
  const snacksAndTiming = questionnaire.foodAndProducts.snacksAndTiming.trim();

  const weightLossGoal = detectWeightLossGoal(questionnaire);
  const userConstraints = parseFoodConstraints(questionnaire);
  const hasLactoseIntolerance = userConstraints.lactose;
  const hasNutAllergy = userConstraints.nuts;

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
  if (userConstraints.gluten) restrictions.push("исключить глютен");
  if (userConstraints.egg) restrictions.push("исключить яйцо");
  if (userConstraints.fish) restrictions.push("исключить рыбу");
  if (userConstraints.meat) restrictions.push("исключить мясо птицы и говядину");
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

  const breakfastPool = ensureCatalogPoolSize(
    filterCatalogForConstraints(BREAKFAST_CATALOG, userConstraints, "breakfast"),
    userConstraints,
    "breakfast",
  );
  const lunchPool = ensureCatalogPoolSize(
    filterCatalogForConstraints(LUNCH_CATALOG, userConstraints, "lunch"),
    userConstraints,
    "lunch",
  );
  const dinnerPool = ensureCatalogPoolSize(
    filterCatalogForConstraints(DINNER_CATALOG, userConstraints, "dinner"),
    userConstraints,
    "dinner",
  );
  const snackPool = ensureCatalogPoolSize(
    filterCatalogForConstraints(SNACK_CATALOG, userConstraints, "snack"),
    userConstraints,
    "snack",
  );

  const histories: DayMenuHistories = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  let lastBreakfastProtein: ProteinKey | null = null;
  let lastSnackProtein: ProteinKey | null = null;
  let dairyYesterday = false;
  const dairyDayFlags: boolean[] = [];

  const days: ProgramDay[] = Array.from({ length: totalDays }, (_, i) => {
    const dayNumber = i + 1;
    const coachingTemplate =
      DAY_COACHING_TEMPLATES[i % DAY_COACHING_TEMPLATES.length];
    const alternativeTemplate =
      DAY_ALTERNATIVE_TEMPLATES[i % DAY_ALTERNATIVE_TEMPLATES.length];

    const { picks, lastBreakfastProtein: nextBfProtein, lastSnackProtein: nextSnackProtein, dairyToday } =
      pickDayMenu({
        dayIndex: i,
        breakfastPool,
        lunchPool,
        dinnerPool,
        snackPool,
        histories,
        lastBreakfastProtein,
        lastSnackProtein,
        mealsPerDay,
        dairyYesterday,
        dairyDayFlags,
        constraints: userConstraints,
      });

    lastBreakfastProtein = nextBfProtein;
    lastSnackProtein = nextSnackProtein;
    dairyYesterday = dairyToday;
    dairyDayFlags[i] = dairyToday;

    const record = (
      slot: keyof DayMenuHistories,
      item: (typeof picks)["breakfast"],
    ): void => {
      const entry: PickHistory = {
        dayIndex: i,
        diversityKey: item.diversityKey,
        protein: item.protein,
        breakfastType: item.breakfastType,
      };
      histories[slot].push(entry);
    };

    record("breakfast", picks.breakfast);
    record("lunch", picks.lunch);
    record("dinner", picks.dinner);
    if (picks.snack) record("snack", picks.snack);
    if (picks.secondSnack) record("snack", picks.secondSnack);

    const fieldCtx: MealFieldContext = {
      hasLactoseIntolerance,
      userConstraints,
      restrictionsInNutritionRules: true,
      dayIndex: i,
    };

    const breakfastFields = buildBreakfastFields(picks.breakfast.dish, fieldCtx);
    const lunchFields = buildLunchFields(picks.lunch.dish, fieldCtx);
    const dinnerFields = buildDinnerFields(picks.dinner.dish, fieldCtx);

    const meals: ProgramMeal[] = [
      meal(
        "breakfast",
        "Завтрак",
        breakfastFields.dish,
        breakfastFields.portion,
        breakfastFields.cooking,
        breakfastFields.replacement,
      ),
      meal(
        "lunch",
        "Обед",
        lunchFields.dish,
        lunchFields.portion,
        lunchFields.cooking,
        lunchFields.replacement,
      ),
      meal(
        "dinner",
        "Ужин",
        dinnerFields.dish,
        dinnerFields.portion,
        dinnerFields.cooking,
        dinnerFields.replacement,
      ),
    ];

    if (picks.snack) {
      const snackFields = buildSnackFields(picks.snack.dish, fieldCtx);
      const habitHint =
        snacksAndTiming &&
        !/печень|конфет|конфетк/i.test(snacksAndTiming)
          ? ` Учтите привычку: ${snacksAndTiming.trim()}.`
          : "";

      meals.push(
        meal(
          "snack",
          "Перекус",
          snackFields.dish,
          snackFields.portion,
          `${snackFields.cooking}${habitHint}`,
          snackFields.replacement,
        ),
      );
    }

    if (picks.secondSnack) {
      const secondSnackFields = buildSnackFields(picks.secondSnack.dish, fieldCtx);
      meals.push(
        meal(
          "secondSnack",
          "Второй перекус",
          secondSnackFields.dish,
          secondSnackFields.portion,
          secondSnackFields.cooking,
          secondSnackFields.replacement,
        ),
      );
    }

    const dayAdviceCadence = i % 4 === 0;
    const sugarAndPortionLine =
      dayAdviceCadence && shouldAvoidSugar
        ? i % 8 === 0
          ? " По напиткам сегодня можно оставить воду или чай."
          : " Сладкое не нужно компенсировать, просто держите следующий прием пищи спокойным."
        : "";
    const lactoseLine = hasLactoseIntolerance
      ? " Если берете молочное, используйте безлактозные варианты."
      : i % 4 === 1
        ? " Из молочного можно оставить кефир или сыр."
        : "";
    const nutsLine = hasNutAllergy
      ? " Орехи не использовать в перекусах и добавках."
      : "";

    const baseCafeOrCanteen = alternativeTemplate.cafeOrCanteen.trim();
    const baseTakeAway = `${alternativeTemplate.takeAway}${lactoseLine}`.trim();
    const baseQuickOption = `${alternativeTemplate.quickOption}${nutsLine}`.trim();
    const sugarTarget: "cafe" | "quick" =
      baseQuickOption.length > 0 ? "quick" : "cafe";

    const alternatives = {
      cafeOrCanteen:
        sugarTarget === "cafe"
          ? `${baseCafeOrCanteen}${sugarAndPortionLine}`.trim()
          : baseCafeOrCanteen,
      takeAway: baseTakeAway,
      quickOption:
        sugarTarget === "quick"
          ? `${baseQuickOption}${sugarAndPortionLine}`.trim()
          : baseQuickOption,
    };

    return {
      dayNumber,
      mood: coachingTemplate.mood,
      focus: coachingTemplate.focus,
      habit: coachingTemplate.habit,
      task: coachingTemplate.task,
      supportMessage: coachingTemplate.supportMessage,
      alternatives,
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

