import { useMemo, useState } from "react";
import {
  questionnaireDefaults,
  type ClientQuestionnaire,
} from "../modules/questionnaire";
import type { PageProps } from "./pageProps";

// TODO: подключить buildPersonalProgram как единый источник дней программы.

function mergeQuestionnaireFromProfile(seed: unknown): ClientQuestionnaire {
  const q =
    seed && typeof seed === "object" && "questionnaire" in seed
      ? (seed as { questionnaire?: Partial<ClientQuestionnaire> }).questionnaire
      : undefined;

  return {
    basics: { ...questionnaireDefaults.basics, ...(q as any)?.basics },
    goalAndDuration: {
      ...questionnaireDefaults.goalAndDuration,
      ...(q as any)?.goalAndDuration,
    },
    medicalParticularities: {
      ...questionnaireDefaults.medicalParticularities,
      ...(q as any)?.medicalParticularities,
    },
    dayScheduleAndWork: {
      ...questionnaireDefaults.dayScheduleAndWork,
      ...(q as any)?.dayScheduleAndWork,
    },
    foodAndProducts: {
      ...questionnaireDefaults.foodAndProducts,
      ...(q as any)?.foodAndProducts,
    },
    budgetSeasonAndAvailability: {
      ...questionnaireDefaults.budgetSeasonAndAvailability,
      ...(q as any)?.budgetSeasonAndAvailability,
    },
    habitsDifficultiesAndSupport: {
      ...questionnaireDefaults.habitsDifficultiesAndSupport,
      ...(q as any)?.habitsDifficultiesAndSupport,
    },
    cookingHabitsAndMethods: (q as any)?.cookingHabitsAndMethods
      ? {
          ...questionnaireDefaults.cookingHabitsAndMethods,
          ...(q as any)?.cookingHabitsAndMethods,
        }
      : undefined,
  };
}

function hasAnyMedicalData(
  m: ClientQuestionnaire["medicalParticularities"],
): boolean {
  return (
    m.hasMedicalParticularities ||
    [m.medicalParticularitiesDescription, m.foodAllergies, m.intolerances, m.medicalDietaryRestrictions].some(
      (v) => v.trim().length > 0,
    )
  );
}

function includesWord(s: string, word: string): boolean {
  return s.toLowerCase().includes(word);
}

function MenuMealCard({
  title,
  dish,
  portion,
  howToCook,
}: {
  title: string;
  dish: string;
  portion: string;
  howToCook: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <p className="text-base font-semibold tracking-tight text-slate-900">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-800">
        <span className="font-medium">Блюдо:</span> {dish}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">
        <span className="font-medium">Порция:</span> {portion}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">
        <span className="font-medium">Как готовить:</span> {howToCook}
      </p>
    </div>
  );
}

export function NutritionPlanPage(
  props: PageProps & { clientQuestionnaire: ClientQuestionnaire | null },
) {
  const { mock, clientQuestionnaire } = props;
  const [showAlternatives, setShowAlternatives] = useState(false);
  const isDemo = clientQuestionnaire === null;
  const q = useMemo(() => {
    if (clientQuestionnaire) return clientQuestionnaire;
    return mergeQuestionnaireFromProfile(mock.user.profile);
  }, [clientQuestionnaire, mock.user.profile]);

  const mealsPerDay = q.foodAndProducts.mealsPerDay;
  const activityLevel = q.dayScheduleAndWork.activityLevel;
  const cooking = q.cookingHabitsAndMethods;
  const snacksAndTiming = q.foodAndProducts.snacksAndTiming.trim();

  const weightLossGoal = [
    q.goalAndDuration.primaryGoal,
    q.goalAndDuration.desiredOutcome,
  ]
    .join(" ")
    .toLowerCase()
    .includes("похуд") ||
    [
      q.goalAndDuration.primaryGoal,
      q.goalAndDuration.desiredOutcome,
    ]
      .join(" ")
      .toLowerCase()
      .includes("снизить вес") ||
    [q.goalAndDuration.primaryGoal, q.goalAndDuration.desiredOutcome]
      .join(" ")
      .toLowerCase()
      .includes("минус") ||
    [q.goalAndDuration.primaryGoal, q.goalAndDuration.desiredOutcome]
      .join(" ")
      .toLowerCase()
      .includes("кг") ||
    [q.goalAndDuration.primaryGoal, q.goalAndDuration.desiredOutcome]
      .join(" ")
      .toLowerCase()
      .includes("килограмм");
  const goalTextLower = [
    q.goalAndDuration.primaryGoal,
    q.goalAndDuration.desiredOutcome,
  ]
    .join(" ")
    .toLowerCase();
  const ambitiousWeightLossGoal =
    weightLossGoal &&
    (goalTextLower.includes("5 кг") ||
      goalTextLower.includes("5кг") ||
      goalTextLower.includes("5 килограмм") ||
      goalTextLower.includes("минус 5"));

  const shouldAvoidSugar =
    weightLossGoal ||
    (cooking?.sugarAddingFrequency !== undefined &&
      cooking.sugarAddingFrequency !== "no") ||
    (cooking?.sweetDrinksFrequency !== undefined &&
      cooking.sweetDrinksFrequency !== "no");

  const intolerancesText = q.medicalParticularities.intolerances;
  const doctorDietRestrictionsText =
    q.medicalParticularities.medicalDietaryRestrictions;
  const medicalNotesText =
    q.medicalParticularities.medicalParticularitiesDescription;
  const cookingMethodsToAvoid = cooking?.cookingMethodsToAvoid ?? "";

  const hasLactoseIntolerance = includesWord(intolerancesText, "лактоз");

  const restrictionTextAll = (
    doctorDietRestrictionsText +
    " " +
    medicalNotesText +
    " " +
    cookingMethodsToAvoid
  ).toLowerCase();
  const hasFryingOrFatRestriction =
    restrictionTextAll.includes("жар") || restrictionTextAll.includes("жирн");

  const showMedicalBlock = hasAnyMedicalData(q.medicalParticularities);

  const medicalBlockLine = showMedicalBlock
    ? "План составлен в мягком режиме: без лечебного рациона и с учётом указанных ограничений. Для точных рекомендаций лучше согласовать питание с профильным врачом."
    : "";

  const portionGuidance = weightLossGoal
    ? "Ориентир для мягкого снижения веса: порции умеренные, сладкие напитки и сахар убираем, перекусы небольшие."
    : activityLevel === "низкий"
      ? "Умеренные порции, перекусы лёгкие."
      : activityLevel === "средний"
        ? "Умеренные порции без жёстких ограничений, акцент на регулярность и качество еды."
        : "Не урезать питание резко: оставить белок, овощи и сложные углеводы.";

  const caloriesHint = weightLossGoal
    ? "Это ориентир для мягкого снижения веса, без обещаний точного результата."
    : "Это ориентир для сбалансированного ежедневного питания.";

  const cookingRuleSuffix = hasFryingOrFatRestriction
    ? " Готовить без зажарки и жирного мяса."
    : " Базово использовать варку, тушение или запекание.";
  const sugarRuleSuffix = shouldAvoidSugar
    ? " Без сахара и сладких напитков."
    : "";

  type MealItem = { dish: string; portion: string; howToCook: string };
  type DayPlan = {
    day: number;
    breakfast: MealItem;
    lunch: MealItem;
    dinner: MealItem;
  };

  const dayPlans: DayPlan[] = [
    {
      day: 1,
      breakfast: {
        dish: "Овсянка на воде с яблоком",
        portion: "Каша 120–180 г + фрукт 80–120 г",
        howToCook: `Сварить 5–7 минут.${sugarRuleSuffix}${cookingRuleSuffix}`,
      },
      lunch: {
        dish: "Гречка с курицей и овощами",
        portion: "Гречка 120–180 г + курица 100–150 г + овощи 150–250 г",
        howToCook: `Курицу отварить/запечь, овощи свежие или тушёные.${cookingRuleSuffix}`,
      },
      dinner: {
        dish: "Рыба или птица с овощами",
        portion: "Белок 100–150 г + овощи 150–250 г",
        howToCook: `Тушить или запекать.${cookingRuleSuffix}`,
      },
    },
    {
      day: 2,
      breakfast: {
        dish: "Омлет с овощами",
        portion: "Омлет из 2 яиц + овощи 150–200 г",
        howToCook: `Готовить на антипригарной сковороде без жарки или запекать.${cookingRuleSuffix}`,
      },
      lunch: {
        dish: "Овощной суп + птица",
        portion: "Суп 250–350 мл + птица 100–150 г",
        howToCook: `Суп варить без жирной зажарки, птицу отварить/запечь.${cookingRuleSuffix}`,
      },
      dinner: {
        dish: "Тушёная индейка с овощами",
        portion: "Индейка 100–150 г + овощи 150–250 г",
        howToCook: `Тушить с небольшим количеством масла или воды.${cookingRuleSuffix}`,
      },
    },
    {
      day: 3,
      breakfast: {
        dish: "Гречневая каша с фруктом",
        portion: "Каша 120–180 г + фрукт 80–120 г",
        howToCook: `Сварить до мягкости.${sugarRuleSuffix}${cookingRuleSuffix}`,
      },
      lunch: {
        dish: "Рис с рыбой и салатом",
        portion: "Рис 120–180 г + рыба 100–150 г + салат 150–250 г",
        howToCook: `Рыбу запечь или приготовить на пару, салат без тяжёлых соусов.${cookingRuleSuffix}`,
      },
      dinner: {
        dish: "Курица с овощами",
        portion: "Курица 100–150 г + овощи 150–250 г",
        howToCook: `Курицу запечь/тушить, овощи тушить или подать свежими.${cookingRuleSuffix}`,
      },
    },
    {
      day: 4,
      breakfast: {
        dish: hasLactoseIntolerance
          ? "Яйцо или каша с фруктом"
          : "Творог с фруктом",
        portion: hasLactoseIntolerance
          ? "Яйцо 1–2 шт или каша 120–180 г + фрукт 80–120 г"
          : "Творог 120–180 г + фрукт 80–120 г",
        howToCook: hasLactoseIntolerance
          ? `При лактозе выбрать яйцо или кашу вместо творога.${sugarRuleSuffix}`
          : `Творог выбрать без сахара и лишних добавок.${sugarRuleSuffix}`,
      },
      lunch: {
        dish: "Лёгкий суп + белок",
        portion: "Суп 250–350 мл + белок 100–150 г",
        howToCook: `Суп без зажарки, белок отварить или запечь.${cookingRuleSuffix}`,
      },
      dinner: {
        dish: "Рыба с овощами",
        portion: "Рыба 100–150 г + овощи 150–250 г",
        howToCook: `Запекать или тушить.${cookingRuleSuffix}`,
      },
    },
    {
      day: 5,
      breakfast: {
        dish: "Овсянка или яйцо",
        portion: "Каша 120–180 г или 2 яйца + овощи/фрукт",
        howToCook: `Готовить без сахара и сладких добавок при необходимости.${sugarRuleSuffix}${cookingRuleSuffix}`,
      },
      lunch: {
        dish: "Булгур с птицей",
        portion: "Булгур 120–180 г + птица 100–150 г + овощи 150–250 г",
        howToCook: `Птицу тушить или запекать, булгур отварить.${cookingRuleSuffix}`,
      },
      dinner: {
        dish: "Овощное рагу с белком",
        portion: "Рагу 200–300 г + белок 100–150 г",
        howToCook: `Овощи тушить, белок добавить отварной/запечённый.${cookingRuleSuffix}`,
      },
    },
    {
      day: 6,
      breakfast: {
        dish: "Гречка или омлет",
        portion: "Каша 120–180 г или омлет из 2 яиц + овощи",
        howToCook: `Сварить кашу или запечь/приготовить омлет без жарки.${cookingRuleSuffix}`,
      },
      lunch: {
        dish: "Суп с курицей",
        portion: "Суп 250–350 мл + курица 100–150 г",
        howToCook: `Суп без жирной зажарки, курицу отварить.${cookingRuleSuffix}`,
      },
      dinner: {
        dish: "Рыба или птица с овощами",
        portion: "Белок 100–150 г + овощи 150–250 г",
        howToCook: `Тушить или запекать.${cookingRuleSuffix}`,
      },
    },
    {
      day: 7,
      breakfast: {
        dish: "Каша с фруктом",
        portion: "Каша 120–180 г + фрукт 80–120 г",
        howToCook: `Сварить кашу, сахар не добавлять при необходимости.${sugarRuleSuffix}${cookingRuleSuffix}`,
      },
      lunch: {
        dish: "Курица или рыба с гарниром",
        portion: "Белок 100–150 г + гарнир 120–180 г + овощи 150–250 г",
        howToCook: `Белок запечь/тушить, гарнир отварить.${cookingRuleSuffix}`,
      },
      dinner: {
        dish: "Лёгкий ужин с овощами и белком",
        portion: "Белок 100–130 г + овощи 150–250 г",
        howToCook: `Готовить легко: тушение/запекание.${cookingRuleSuffix}`,
      },
    },
  ];

  const snackVariants = shouldAvoidSugar
    ? [
        "Фрукт или чай без сахара",
        "Яйцо и овощи",
        "Овощная нарезка и несладкий напиток",
        "Фрукт (небольшая порция)",
      ]
    : [
        "Фрукт или чай",
        "Яйцо и овощи",
        "Овощная нарезка и несладкий напиток",
        "Фрукт (небольшая порция)",
      ];
  const snackPortion = "Маленькая порция";
  const snackHowToCookBase = weightLossGoal
    ? `Выбрать небольшой перекус и не увеличивать общий объём еды.${sugarRuleSuffix}`
    : `Выбрать небольшой перекус.${sugarRuleSuffix}`;

  const secondSnackDish = "Овощи, яйцо или чай";
  const secondSnackPortion = "Маленькая порция";
  const secondSnackHowToCook = `Лёгкий второй перекус без перегруза.${sugarRuleSuffix}`;

  const showFirstSnack = mealsPerDay > 3;
  const showSecondSnack = mealsPerDay > 4;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          План питания
        </h1>
      </header>

      {isDemo ? (
        <div
          role="note"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700"
        >
          План показан по демо-данным. Чтобы учесть вашу анкету, сначала
          заполните анкету и соберите программу.
        </div>
      ) : null}

      {showMedicalBlock ? (
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 px-4 py-4 text-sm leading-relaxed text-amber-950">
          {medicalBlockLine}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          Ориентир по калориям и порциям
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
          {portionGuidance}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {caloriesHint}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Калории и порции указаны как ориентир. Для точной нормы лучше
          согласовать питание с профильным врачом.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Порции: каша/гарнир 120-180 г, белок 100-150 г, овощи 150-250 г, суп
          250-350 мл, перекус — маленькая порция.
        </p>
        {ambitiousWeightLossGoal ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
            Цель выглядит амбициозной для короткого срока. План даёт мягкий
            ориентир для снижения веса без жёстких ограничений. Безопасный темп
            лучше согласовать с профильным врачом.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          План питания на 7 дней
        </h2>
        <p className="text-sm text-slate-600">
          Этот 7-дневный план можно повторять на 2 недели, адаптируя блюда под
          доступные продукты и ограничения.
        </p>

        <div className="space-y-6">
          {dayPlans.map((day, idx) => (
            <section
              key={day.day}
              className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                День {day.day}
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <MenuMealCard
                  title="Завтрак"
                  dish={day.breakfast.dish}
                  portion={day.breakfast.portion}
                  howToCook={day.breakfast.howToCook}
                />
                <MenuMealCard
                  title="Обед"
                  dish={day.lunch.dish}
                  portion={day.lunch.portion}
                  howToCook={day.lunch.howToCook}
                />
                <MenuMealCard
                  title="Ужин"
                  dish={day.dinner.dish}
                  portion={day.dinner.portion}
                  howToCook={day.dinner.howToCook}
                />
                {showFirstSnack ? (
                  <MenuMealCard
                    title="Перекус"
                    dish={snacksAndTiming ? `Текущая привычка: ${snacksAndTiming}` : snackVariants[idx % snackVariants.length]}
                    portion={snackPortion}
                    howToCook={
                      snacksAndTiming
                        ? `Мягкая замена: ${snackVariants[idx % snackVariants.length]}. ${snackHowToCookBase}`
                        : snackHowToCookBase
                    }
                  />
                ) : null}
                {showSecondSnack ? (
                  <MenuMealCard
                    title="Второй перекус"
                    dish={secondSnackDish}
                    portion={secondSnackPortion}
                    howToCook={secondSnackHowToCook}
                  />
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAlternatives((v) => !v)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
        >
          {showAlternatives ? "Скрыть альтернативы" : "Показать альтернативы"}
        </button>

        {showAlternatives ? (
          <section className="space-y-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900">
              Альтернативные варианты
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
                <p className="text-sm font-medium text-slate-900">
                  Если едите в столовой или кафе
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  Выбирайте простую тарелку: белок + гарнир + овощи. Например:
                  курица/рыба/яйцо + гречка/рис/картофель + салат.
                  {weightLossGoal
                    ? " Порции лучше брать умеренные, сладкие напитки не выбирать."
                    : ""}{" "}
                  Соусы и жареное лучше не брать
                  {weightLossGoal || hasFryingOrFatRestriction
                    ? ", особенно если цель — снижение веса или есть ограничения."
                    : "."}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
                <p className="text-sm font-medium text-slate-900">
                  Если нужно взять с собой
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  Подойдут контейнеры: гречка/рис/булгур + птица/рыба/яйцо +
                  овощи. Перекус: фрукт, яйцо, овощи или несладкий напиток
                  {!hasLactoseIntolerance ? ", можно йогурт без сахара." : "."}
                  {weightLossGoal
                    ? " Если цель — снижение веса, перекусы лучше делать небольшими."
                    : ""}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
                <p className="text-sm font-medium text-slate-900">
                  Если хочется жидкое блюдо
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  Можно добавить суп: овощной суп, куриный суп, лёгкий борщ без
                  жирной зажарки.
                  {hasFryingOrFatRestriction
                    ? " Если есть ограничения по жирному или жареному — выбирать суп без зажарки и жирного мяса."
                    : ""}
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}

