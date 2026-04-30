import { useMemo, useState } from "react";
import {
  questionnaireDefaults,
  type ClientQuestionnaire,
} from "../modules/questionnaire";
import { buildPersonalProgram } from "../modules/programBuilder";
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

function includesWord(s: string, word: string): boolean {
  return s.toLowerCase().includes(word);
}

function MenuMealCard({
  title,
  dish,
  portion,
  howToCook,
  replacement,
}: {
  title: string;
  dish: string;
  portion: string;
  howToCook: string;
  replacement?: string;
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
      {replacement ? (
        <p className="mt-1 text-sm leading-relaxed text-slate-800">
          <span className="font-medium">Замена:</span> {replacement}
        </p>
      ) : null}
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
  const personalProgram = useMemo(() => buildPersonalProgram(q), [q]);

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

  const intolerancesText = q.medicalParticularities.intolerances;
  const doctorDietRestrictionsText =
    q.medicalParticularities.medicalDietaryRestrictions;
  const medicalNotesText =
    q.medicalParticularities.medicalParticularitiesDescription;
  const cookingMethodsToAvoid =
    q.cookingHabitsAndMethods?.cookingMethodsToAvoid ?? "";

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

  const medicalBlockLine = personalProgram.nutritionRules.medicalNote;
  const portionGuidance = personalProgram.nutritionRules.portionGuidance;

  const caloriesHint = weightLossGoal
    ? "Это ориентир для мягкого снижения веса, без обещаний точного результата."
    : "Это ориентир для сбалансированного ежедневного питания.";

  const showMedicalBlock = Boolean(medicalBlockLine);

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
          Калории и порции указаны как ориентир. Приложение не ставит диагнозы
          и не лечит. Если есть заболевания, прием лекарств, анализы или
          выраженные ограничения, важно согласовать питание со специалистом. Для
          разбора питания и безопасных корректировок можно обратиться ко мне,
          Олесе Богураевой.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Порции: каша/гарнир 120-180 г, птица или рыба 100-150 г, овощи 150-250
          г, суп 250-350 мл, перекус — маленькая порция.
        </p>
        {ambitiousWeightLossGoal ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
            Цель выглядит амбициозной для короткого срока. План даёт мягкий
            ориентир для снижения веса без жёстких ограничений. Для безопасных
            корректировок можно обсудить ваш рацион со специалистом или
            обратиться ко мне, Олесе Богураевой.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          План питания на 14 дней
        </h2>
        <p className="text-sm text-slate-600">
          План рассчитан на 14 дней. Блюда можно адаптировать под доступные
          продукты и указанные ограничения.
        </p>

        <div className="space-y-6">
          {personalProgram.days.map((day) => (
            <section
              key={day.dayNumber}
              className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                День {day.dayNumber}
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {day.meals.map((meal) => (
                  <MenuMealCard
                    key={`${day.dayNumber}-${meal.type}`}
                    title={meal.title}
                    dish={meal.dish}
                    portion={meal.portion}
                    howToCook={meal.cooking}
                    replacement={meal.replacement}
                  />
                ))}
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
                  Выбирайте простую тарелку: курица/рыба/яйцо + гарнир + овощи.
                  Например:
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

