import { useMemo, useState } from "react";
import {
  questionnaireDefaults,
  type ClientQuestionnaire,
} from "../modules/questionnaire";
import type { PageProps } from "./pageProps";

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
  howToCook,
  replacement,
}: {
  title: string;
  dish: string;
  howToCook: string;
  replacement: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold tracking-tight text-slate-900">
        {title}
      </p>
      <p className="mt-2 text-sm text-slate-800">
        <span className="font-medium">Блюдо:</span> {dish}
      </p>
      <p className="mt-1 text-sm text-slate-800">
        <span className="font-medium">Как готовить:</span> {howToCook}
      </p>
      <p className="mt-1 text-sm text-slate-800">
        <span className="font-medium">Замена:</span> {replacement}
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
    ? "Умеренные порции, небольшие перекусы, без сладких напитков и сахара."
    : activityLevel === "низкий"
      ? "Умеренные порции, перекусы лёгкие."
      : activityLevel === "средний"
        ? "Умеренные порции без жёстких ограничений, акцент на регулярность и качество еды."
        : "Не урезать питание резко: оставить белок, овощи и сложные углеводы.";

  const lunchHowToCookAddon = hasFryingOrFatRestriction
    ? " без жарки и жирного."
    : "";

  const dinnerHowToCookAddon = hasFryingOrFatRestriction
    ? " без жарки и жирного."
    : "";

  const breakfastDish = "Овсянка на воде с яблоком";
  const breakfastHowToCook = shouldAvoidSugar
    ? "Сварить 5–7 минут, сахар не добавлять."
    : "Сварить 5–7 минут.";
  const breakfastReplacement = "Омлет с овощами или гречневая каша.";

  const lunchDish = "Гречка с курицей и овощами";
  const lunchHowToCook = `Курицу отварить или запечь, овощи добавить свежими или тушёными.${lunchHowToCookAddon}`;
  const lunchReplacement = "Рис/булгур + рыба/птица + овощи.";

  const dinnerDish = "Рыба или птица с тушёными овощами";
  const dinnerHowToCook = `Тушить или запекать.${dinnerHowToCookAddon}`;
  const dinnerReplacement = "Омлет с овощами или бобовые с овощами.";

  const snackDish = hasLactoseIntolerance
    ? shouldAvoidSugar
      ? "Фрукт или чай без сахара"
      : "Фрукт или чай"
    : shouldAvoidSugar
      ? "Фрукт, йогурт без сахара или чай без сахара"
      : "Фрукт, йогурт или чай";
  const snackHowToCook = weightLossGoal
    ? "Выбрать небольшую порцию, без сладких напитков и сахара. Не увеличивать общий объём еды."
    : shouldAvoidSugar
      ? "Выбрать небольшую порцию, без сладких напитков и сахара."
      : "Выбрать небольшую порцию.";
  const snackReplacement = hasLactoseIntolerance
    ? shouldAvoidSugar
      ? "Овощи или несладкий напиток."
      : "Овощи или напиток."
    : shouldAvoidSugar
      ? "Овощи, яйцо или несладкий напиток."
      : "Овощи, яйцо или напиток.";

  const secondSnackDish = shouldAvoidSugar
    ? "Овощи, яйцо или чай без сахара"
    : "Овощи, яйцо или чай";
  const secondSnackHowToCook = shouldAvoidSugar
    ? "Небольшая порция, без сахара."
    : "Небольшая порция.";
  const secondSnackReplacement = "Фрукт или овощная нарезка.";

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
          Ориентир по порциям
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
          {portionGuidance}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          Меню на день
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <MenuMealCard
            title="Завтрак"
            dish={breakfastDish}
            howToCook={breakfastHowToCook}
            replacement={breakfastReplacement}
          />
          <MenuMealCard
            title="Обед"
            dish={lunchDish}
            howToCook={lunchHowToCook}
            replacement={lunchReplacement}
          />
          <MenuMealCard
            title="Ужин"
            dish={dinnerDish}
            howToCook={dinnerHowToCook}
            replacement={dinnerReplacement}
          />
          {showFirstSnack ? (
            <MenuMealCard
              title="Перекус"
              dish={snackDish}
              howToCook={
                snacksAndTiming
                  ? `Обычно: ${snacksAndTiming}. ${snackHowToCook}`
                  : snackHowToCook
              }
              replacement={snackReplacement}
            />
          ) : null}
          {showSecondSnack ? (
            <MenuMealCard
              title="Второй перекус"
              dish={secondSnackDish}
              howToCook={secondSnackHowToCook}
              replacement={secondSnackReplacement}
            />
          ) : null}
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

