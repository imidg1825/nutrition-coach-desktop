import type { ClientQuestionnaire } from "../questionnaire";
import type { PersonalProgram, ProgramDay, ProgramMeal } from "./types";

type DayTemplate = {
  breakfast: string;
  lunch: string;
  dinner: string;
};

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
    lunch: "Лёгкий суп + курица, рыба, индейка или яйца",
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
    task: "Сделать ужин легче по объему, но оставить курицу, рыбу или яйца",
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
    task: "На обед или ужин соберите простую тарелку: птица или рыба + гарнир + овощи",
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
      return "Не урезать питание резко: оставить мясо/рыба/яйцо, овощи и сложные углеводы.";
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

const PROTEIN_SOURCE_VARIANTS = [
  "курица или индейка",
  "рыба или морепродукты",
  "яйца или птица",
  "нежирное мясо или рыба",
];

const PROTEIN_PHRASE_VARIANTS = [
  "курица или рыба",
  "птица или рыба",
  "мясо/рыба/яйцо",
  "один из вариантов: курица, рыба или яйца",
];

const DAY_ALTERNATIVE_TEMPLATES: DayAlternativeTemplate[] = [
  {
    cafeOrCanteen:
      "Если получилось так, что обед только в столовой, берите суп + котлету с гарниром или рис + курицу + салат.",
    takeAway: "",
    quickOption: "",
  },
  {
    cafeOrCanteen:
      "Если день в разъездах, подойдёт бизнес-ланч: суп + второе или салат + горячее.",
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
      "Если берете доставку, можно заказать суп, рис с курицей или рыбу с гарниром и салат.",
    takeAway:
      "Если был кофе с печеньем - просто продолжайте день как обычно, а в следующий приём пищи возьмите яйцо, сыр или салат.",
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
      "Если выбора нет - берите суп + второе: например, гречка с котлетой или рыба с картофелем.",
    takeAway: "",
    quickOption: "Если времени нет вообще (2 минуты), подойдёт кефир, банан и вода.",
  },
  {
    cafeOrCanteen:
      "Если выбираете доставку, берите салат + горячее или суп + рис с курицей.",
    takeAway:
      "Если готовить утром некогда, выручат остатки с вчера или готовые блюда из кулинарии.",
    quickOption: "",
  },
  {
    cafeOrCanteen:
      "Если встречи до вечера, можно поесть в кафе без сложностей: суп + второе или салат + горячее.",
    takeAway: "На такой день берите еду с собой: контейнер и небольшой перекус.",
    quickOption: "Ничего страшного, если не идеально.",
  },
  {
    cafeOrCanteen:
      "Если съели сладкое, это ок: в следующий прием пищи можно взять что-то обычное - суп, салат или горячее без лишних добавок.",
    takeAway:
      "Подойдёт формат 'что есть дома': остатки ужина, бутерброд, овощи или готовая еда.",
    quickOption: "",
  },
];

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
    const coachingTemplate =
      DAY_COACHING_TEMPLATES[i % DAY_COACHING_TEMPLATES.length];
    const dailySnack = snackVariants[i % snackVariants.length];
    const proteinSource = PROTEIN_SOURCE_VARIANTS[i % PROTEIN_SOURCE_VARIANTS.length];
    const proteinPhrase = PROTEIN_PHRASE_VARIANTS[i % PROTEIN_PHRASE_VARIANTS.length];
    const alternativeTemplate =
      DAY_ALTERNATIVE_TEMPLATES[i % DAY_ALTERNATIVE_TEMPLATES.length];

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
        `Гарнир 120-180 г + ${proteinSource} 100-150 г + овощи 150-250 г`,
        `Суп: 250-350 мл. ${proteinPhrase}: отварить или запечь.${cookingSuffix}`,
        `Рис/гречка/булгур + ${proteinPhrase} + овощи`,
      ),
      meal(
        "dinner",
        "Ужин",
        template.dinner,
        `${proteinSource} 100-150 г + овощи 150-250 г`,
        `Лёгкий ужин: тушение/запекание.${cookingSuffix}`,
        `Омлет с овощами или ${proteinPhrase}`,
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

