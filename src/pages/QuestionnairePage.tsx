import { useMemo, useState, type ReactNode } from "react";
import {
  questionnaireDefaults,
  type ActivityLevelLmh,
  type ClientQuestionnaire,
  type ComfortablePace,
  type FoodBudgetLevel,
  type FrequencyNeverSometimesOften,
  type ProductAvailability,
  type ProgramDurationDays,
  type SeasonChoice,
  type SupportTone,
  type WorkType,
  type YesNoSometimes,
} from "../modules/questionnaire";
import type { PageProps } from "./pageProps";

const STEP_COUNT = 7;

const STEP_TITLES = [
  "Базовые данные",
  "Цель и срок программы",
  "Медицинские особенности и ограничения",
  "Режим дня и работа",
  "Питание и продукты",
  "Бюджет, сезонность и доступность",
  "Привычки, сложности и мягкое сопровождение",
] as const;

const MEDICAL_WARNING =
  "Вы указали медицинские особенности. Мы можем предложить только общие мягкие рекомендации и привычки, но не лечебный рацион. Перед изменением питания мы бы посоветовали обсудить программу с врачом или профильным специалистом.";

function deepMergeQuestionnaire(
  seed: unknown,
): ClientQuestionnaire {
  const q = (seed && typeof seed === "object" && "questionnaire" in seed
    ? (seed as { questionnaire?: Partial<ClientQuestionnaire> }).questionnaire
    : undefined) ?? {};
  return {
    basics: { ...questionnaireDefaults.basics, ...q.basics },
    goalAndDuration: {
      ...questionnaireDefaults.goalAndDuration,
      ...q.goalAndDuration,
    },
    medicalParticularities: {
      ...questionnaireDefaults.medicalParticularities,
      ...q.medicalParticularities,
    },
    dayScheduleAndWork: {
      ...questionnaireDefaults.dayScheduleAndWork,
      ...q.dayScheduleAndWork,
    },
    foodAndProducts: {
      ...questionnaireDefaults.foodAndProducts,
      ...q.foodAndProducts,
    },
    budgetSeasonAndAvailability: {
      ...questionnaireDefaults.budgetSeasonAndAvailability,
      ...q.budgetSeasonAndAvailability,
    },
    habitsDifficultiesAndSupport: {
      ...questionnaireDefaults.habitsDifficultiesAndSupport,
      ...q.habitsDifficultiesAndSupport,
    },
  };
}

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

const selectClass = inputClass;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {children}
      </label>
      {hint ? (
        <p className="text-xs leading-relaxed text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function SegmentedBool({
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  yesLabel: string;
  noLabel: string;
}) {
  const base =
    "rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40";
  const active = "border-accent bg-accent text-white";
  const idle = "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        className={`${base} ${!value ? active : idle}`}
        onClick={() => onChange(false)}
      >
        {noLabel}
      </button>
      <button
        type="button"
        className={`${base} ${value ? active : idle}`}
        onClick={() => onChange(true)}
      >
        {yesLabel}
      </button>
    </div>
  );
}

function SegmentedTri<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const base =
    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 sm:text-sm";
  const active = "border-accent bg-accent text-white";
  const idle = "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`${base} ${value === o.value ? active : idle}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function QuestionnairePage({ mock, navigate }: PageProps) {
  const initial = useMemo(
    () => deepMergeQuestionnaire(mock.user.profile),
    [mock.user.profile],
  );
  const [form, setForm] = useState<ClientQuestionnaire>(initial);
  const [step, setStep] = useState(1);
  const [questionnaireFinished, setQuestionnaireFinished] = useState(false);

  const progressPct = (step / STEP_COUNT) * 100;

  const goNext = () => setStep((s) => Math.min(STEP_COUNT, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleRightAction = () => {
    if (step === STEP_COUNT) {
      setQuestionnaireFinished(true);
      return;
    }
    goNext();
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Анкета клиента
        </h1>
        <p className="text-sm leading-relaxed text-slate-500">
          Пошаговые вопросы помогут собрать мягкое сопровождение под вашу жизнь.
          Данные пока только на этом экране — сохранение на диск позже.
        </p>
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Шаг {step} из {STEP_COUNT}
          </span>
          <span className="truncate pl-2 text-right text-slate-600">
            {STEP_TITLES[step - 1]}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-accent/90 transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
        {step === 1 ? (
          <div className="space-y-5">
            <Field label="Имя">
              <input
                className={inputClass}
                value={form.basics.firstName}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    basics: { ...f.basics, firstName: e.target.value },
                  }))
                }
                autoComplete="given-name"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Возраст">
                <input
                  type="number"
                  min={0}
                  max={120}
                  className={inputClass}
                  value={form.basics.age || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      basics: {
                        ...f.basics,
                        age: Number.parseInt(e.target.value, 10) || 0,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Рост (см)">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.basics.heightCm || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      basics: {
                        ...f.basics,
                        heightCm: Number.parseInt(e.target.value, 10) || 0,
                      },
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Вес (кг)">
              <input
                type="number"
                min={0}
                step={0.1}
                className={inputClass}
                value={form.basics.weightKg || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    basics: {
                      ...f.basics,
                      weightKg: Number.parseFloat(e.target.value) || 0,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Город или регион">
              <input
                className={inputClass}
                value={form.basics.cityOrRegion}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    basics: { ...f.basics, cityOrRegion: e.target.value },
                  }))
                }
              />
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <Field label="Основная цель">
              <textarea
                rows={3}
                className={`${inputClass} resize-y`}
                value={form.goalAndDuration.primaryGoal}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    goalAndDuration: {
                      ...f.goalAndDuration,
                      primaryGoal: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Срок программы (дней)">
              <select
                className={selectClass}
                value={form.goalAndDuration.programDurationDays}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    goalAndDuration: {
                      ...f.goalAndDuration,
                      programDurationDays: Number(
                        e.target.value,
                      ) as ProgramDurationDays,
                    },
                  }))
                }
              >
                {([7, 14, 21, 30] as const).map((d) => (
                  <option key={d} value={d}>
                    {d} дней
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Желаемый результат">
              <textarea
                rows={3}
                className={`${inputClass} resize-y`}
                value={form.goalAndDuration.desiredOutcome}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    goalAndDuration: {
                      ...f.goalAndDuration,
                      desiredOutcome: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field
              label="Комфортный темп"
              hint="Насколько плотным может быть ритм заданий."
            >
              <SegmentedTri<ComfortablePace>
                value={form.goalAndDuration.comfortablePace}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    goalAndDuration: { ...f.goalAndDuration, comfortablePace: v },
                  }))
                }
                options={[
                  { value: "мягкий", label: "Мягкий" },
                  { value: "средний", label: "Средний" },
                  { value: "дисциплинированный", label: "Дисциплинированный" },
                ]}
              />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div>
              <span className="text-sm font-medium text-slate-700">
                Есть ли медицинские особенности, о которых нам важно знать?
              </span>
              <SegmentedBool
                value={form.medicalParticularities.hasMedicalParticularities}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    medicalParticularities: {
                      ...f.medicalParticularities,
                      hasMedicalParticularities: v,
                    },
                  }))
                }
                yesLabel="Да, есть"
                noLabel="Нет"
              />
            </div>
            {form.medicalParticularities.hasMedicalParticularities ? (
              <blockquote className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-950">
                {MEDICAL_WARNING}
              </blockquote>
            ) : null}
            <Field label="Описание медицинских особенностей (по желанию)">
              <textarea
                rows={3}
                className={`${inputClass} resize-y`}
                value={form.medicalParticularities.medicalParticularitiesDescription}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    medicalParticularities: {
                      ...f.medicalParticularities,
                      medicalParticularitiesDescription: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Пищевые аллергии">
              <input
                className={inputClass}
                value={form.medicalParticularities.foodAllergies}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    medicalParticularities: {
                      ...f.medicalParticularities,
                      foodAllergies: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Непереносимости">
              <input
                className={inputClass}
                value={form.medicalParticularities.intolerances}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    medicalParticularities: {
                      ...f.medicalParticularities,
                      intolerances: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Врачебные ограничения по питанию">
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={form.medicalParticularities.medicalDietaryRestrictions}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    medicalParticularities: {
                      ...f.medicalParticularities,
                      medicalDietaryRestrictions: e.target.value,
                    },
                  }))
                }
              />
            </Field>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Время подъёма">
                <input
                  className={inputClass}
                  value={form.dayScheduleAndWork.wakeTime}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dayScheduleAndWork: {
                        ...f.dayScheduleAndWork,
                        wakeTime: e.target.value,
                      },
                    }))
                  }
                  placeholder="например, 07:00"
                />
              </Field>
              <Field label="Время сна">
                <input
                  className={inputClass}
                  value={form.dayScheduleAndWork.sleepTime}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dayScheduleAndWork: {
                        ...f.dayScheduleAndWork,
                        sleepTime: e.target.value,
                      },
                    }))
                  }
                  placeholder="например, 23:30"
                />
              </Field>
            </div>
            <Field label="Тип работы">
              <select
                className={selectClass}
                value={form.dayScheduleAndWork.workType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dayScheduleAndWork: {
                      ...f.dayScheduleAndWork,
                      workType: e.target.value as WorkType,
                    },
                  }))
                }
              >
                {(
                  ["сидячая", "активная", "сменная", "удалённая"] as WorkType[]
                ).map((w) => (
                  <option key={w} value={w}>
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Рабочий график (кратко)">
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={form.dayScheduleAndWork.workScheduleNotes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dayScheduleAndWork: {
                      ...f.dayScheduleAndWork,
                      workScheduleNotes: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Когда обычно удобно есть">
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={form.dayScheduleAndWork.usualMealTimesNotes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dayScheduleAndWork: {
                      ...f.dayScheduleAndWork,
                      usualMealTimesNotes: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Уровень активности">
              <SegmentedTri<ActivityLevelLmh>
                value={form.dayScheduleAndWork.activityLevel}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    dayScheduleAndWork: {
                      ...f.dayScheduleAndWork,
                      activityLevel: v,
                    },
                  }))
                }
                options={[
                  { value: "низкий", label: "Низкий" },
                  { value: "средний", label: "Средний" },
                  { value: "высокий", label: "Высокий" },
                ]}
              />
            </Field>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-5">
            <Field label="Количество приёмов пищи в день">
              <input
                type="number"
                min={1}
                max={8}
                className={inputClass}
                value={form.foodAndProducts.mealsPerDay || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    foodAndProducts: {
                      ...f.foodAndProducts,
                      mealsPerDay: Number.parseInt(e.target.value, 10) || 1,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Обычный завтрак">
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={form.foodAndProducts.usualBreakfast}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    foodAndProducts: {
                      ...f.foodAndProducts,
                      usualBreakfast: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Обычный обед">
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={form.foodAndProducts.usualLunch}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    foodAndProducts: {
                      ...f.foodAndProducts,
                      usualLunch: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Обычный ужин">
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={form.foodAndProducts.usualDinner}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    foodAndProducts: {
                      ...f.foodAndProducts,
                      usualDinner: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Любимые продукты">
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={form.foodAndProducts.favoriteFoods}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    foodAndProducts: {
                      ...f.foodAndProducts,
                      favoriteFoods: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Продукты, которые не едите">
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={form.foodAndProducts.foodsNotEaten}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    foodAndProducts: {
                      ...f.foodAndProducts,
                      foodsNotEaten: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Тяга к сладкому">
              <SegmentedTri<FrequencyNeverSometimesOften>
                value={form.foodAndProducts.sweetCraving}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    foodAndProducts: { ...f.foodAndProducts, sweetCraving: v },
                  }))
                }
                options={[
                  { value: "нет", label: "Нет" },
                  { value: "иногда", label: "Иногда" },
                  { value: "часто", label: "Часто" },
                ]}
              />
            </Field>
            <Field label="Вечерние перекусы">
              <SegmentedTri<FrequencyNeverSometimesOften>
                value={form.foodAndProducts.eveningSnacks}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    foodAndProducts: { ...f.foodAndProducts, eveningSnacks: v },
                  }))
                }
                options={[
                  { value: "нет", label: "Нет" },
                  { value: "иногда", label: "Иногда" },
                  { value: "часто", label: "Часто" },
                ]}
              />
            </Field>
            <Field label="Частые сложности с питанием">
              <textarea
                rows={3}
                className={`${inputClass} resize-y`}
                value={form.foodAndProducts.commonNutritionChallenges}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    foodAndProducts: {
                      ...f.foodAndProducts,
                      commonNutritionChallenges: e.target.value,
                    },
                  }))
                }
              />
            </Field>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-5">
            <Field label="Бюджет на питание">
              <SegmentedTri<FoodBudgetLevel>
                value={form.budgetSeasonAndAvailability.foodBudget}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    budgetSeasonAndAvailability: {
                      ...f.budgetSeasonAndAvailability,
                      foodBudget: v,
                    },
                  }))
                }
                options={[
                  { value: "низкий", label: "Низкий" },
                  { value: "средний", label: "Средний" },
                  { value: "свободный", label: "Свободный" },
                ]}
              />
            </Field>
            <Field label="Доступность продуктов">
              <select
                className={selectClass}
                value={form.budgetSeasonAndAvailability.productAvailability}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    budgetSeasonAndAvailability: {
                      ...f.budgetSeasonAndAvailability,
                      productAvailability: e.target.value as ProductAvailability,
                    },
                  }))
                }
              >
                {(
                  [
                    "обычные магазины",
                    "рынок",
                    "доставка",
                    "ограниченный выбор",
                  ] as ProductAvailability[]
                ).map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Сезон для подборок">
              <select
                className={selectClass}
                value={form.budgetSeasonAndAvailability.season}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    budgetSeasonAndAvailability: {
                      ...f.budgetSeasonAndAvailability,
                      season: e.target.value as SeasonChoice,
                    },
                  }))
                }
              >
                {(
                  ["авто", "весна", "лето", "осень", "зима"] as SeasonChoice[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {s === "авто" ? "Авто (по дате)" : s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Готовность покупать редкие продукты">
              <SegmentedTri<YesNoSometimes>
                value={form.budgetSeasonAndAvailability.willingToBuyRareProducts}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    budgetSeasonAndAvailability: {
                      ...f.budgetSeasonAndAvailability,
                      willingToBuyRareProducts: v,
                    },
                  }))
                }
                options={[
                  { value: "да", label: "Да" },
                  { value: "нет", label: "Нет" },
                  { value: "иногда", label: "Иногда" },
                ]}
              />
            </Field>
            <Field label="Нужны ли простые замены продуктов">
              <SegmentedTri<"да" | "нет">
                value={form.budgetSeasonAndAvailability.needsSimpleProductSubstitutions}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    budgetSeasonAndAvailability: {
                      ...f.budgetSeasonAndAvailability,
                      needsSimpleProductSubstitutions: v,
                    },
                  }))
                }
                options={[
                  { value: "да", label: "Да" },
                  { value: "нет", label: "Нет" },
                ]}
              />
            </Field>
          </div>
        ) : null}

        {step === 7 ? (
          <div className="space-y-5">
            <Field
              label="Текущие полезные привычки"
              hint="Что уже помогает вам в дне."
            >
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={form.habitsDifficultiesAndSupport.helpfulHabitsNotes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    habitsDifficultiesAndSupport: {
                      ...f.habitsDifficultiesAndSupport,
                      helpfulHabitsNotes: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field
              label="Привычки, которые мешают результату"
              hint="Без оценки — просто честно, как вам комфортнее."
            >
              <textarea
                rows={3}
                className={`${inputClass} resize-y`}
                placeholder="Например, поздний ужин или перекусы при усталости"
                value={
                  form.habitsDifficultiesAndSupport.habitsHinderingProgressNotes
                }
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    habitsDifficultiesAndSupport: {
                      ...f.habitsDifficultiesAndSupport,
                      habitsHinderingProgressNotes: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Курение (кратко)">
              <input
                className={inputClass}
                value={form.habitsDifficultiesAndSupport.smokingNotes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    habitsDifficultiesAndSupport: {
                      ...f.habitsDifficultiesAndSupport,
                      smokingNotes: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Алкоголь (кратко)">
              <input
                className={inputClass}
                value={form.habitsDifficultiesAndSupport.alcoholNotes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    habitsDifficultiesAndSupport: {
                      ...f.habitsDifficultiesAndSupport,
                      alcoholNotes: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            {(
              [
                {
                  key: "frequentSweetenedDrinks",
                  label: "Частые сладкие напитки",
                },
                { key: "fastFoodFrequency", label: "Фастфуд" },
                { key: "nightSnacks", label: "Ночные перекусы" },
                { key: "stressOvereating", label: "Переедание на стрессе" },
                {
                  key: "skippedBreakfastOrLunch",
                  label: "Пропуски завтрака или обеда",
                },
                { key: "insufficientSleep", label: "Недосып" },
                { key: "lowPhysicalActivity", label: "Малоподвижность" },
              ] as const
            ).map(({ key, label }) => (
              <Field key={key} label={label}>
                <SegmentedTri<FrequencyNeverSometimesOften>
                  value={
                    form.habitsDifficultiesAndSupport[
                      key
                    ] as FrequencyNeverSometimesOften
                  }
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      habitsDifficultiesAndSupport: {
                        ...f.habitsDifficultiesAndSupport,
                        [key]: v,
                      },
                    }))
                  }
                  options={[
                    { value: "нет", label: "Нет" },
                    { value: "иногда", label: "Иногда" },
                    { value: "часто", label: "Часто" },
                  ]}
                />
              </Field>
            ))}
            <Field label="Главные сложности">
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={form.habitsDifficultiesAndSupport.mainChallenges}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    habitsDifficultiesAndSupport: {
                      ...f.habitsDifficultiesAndSupport,
                      mainChallenges: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Что чаще всего мешает">
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={form.habitsDifficultiesAndSupport.whatOftenGetsInTheWay}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    habitsDifficultiesAndSupport: {
                      ...f.habitsDifficultiesAndSupport,
                      whatOftenGetsInTheWay: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Как вы обычно реагируете на пропуски дня">
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={form.habitsDifficultiesAndSupport.reactionToSkips}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    habitsDifficultiesAndSupport: {
                      ...f.habitsDifficultiesAndSupport,
                      reactionToSkips: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field
              label="Комфортный тон мягкого сопровождения"
              hint="Как подстраивать напоминания и формулировки."
            >
              <SegmentedTri<SupportTone>
                value={form.habitsDifficultiesAndSupport.preferredSupportTone}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    habitsDifficultiesAndSupport: {
                      ...f.habitsDifficultiesAndSupport,
                      preferredSupportTone: v,
                    },
                  }))
                }
                options={[
                  { value: "мягкий", label: "Мягкий" },
                  { value: "нейтральный", label: "Нейтральный" },
                  { value: "бодрый", label: "Бодрый" },
                ]}
              />
            </Field>
          </div>
        ) : null}
      </section>

      <footer className="space-y-3">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step <= 1}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
          >
            Назад
          </button>
          <button
            type="button"
            onClick={handleRightAction}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            {step < STEP_COUNT ? "Далее" : "Завершить анкету"}
          </button>
        </div>
        {questionnaireFinished ? (
          <div
            role="status"
            className="rounded-xl border border-green-200/80 bg-green-50 px-5 py-4 text-green-950"
          >
            <h2 className="text-base font-semibold tracking-tight">
              Анкета заполнена
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-green-900/95">
              Мы подготовили данные для сборки вашей программы. Следующий шаг —
              собрать персональную программу на основе ваших ответов.
            </p>
            <button
              type="button"
              onClick={() => navigate("building")}
              className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              Перейти к сборке программы
            </button>
          </div>
        ) : null}
      </footer>
    </div>
  );
}
