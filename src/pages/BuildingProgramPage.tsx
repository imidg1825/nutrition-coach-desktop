import { useMemo, useState } from "react";
import {
  questionnaireDefaults,
  type ClientQuestionnaire,
  type SupportTone,
} from "../modules/questionnaire";
import type { PageProps } from "./pageProps";

function mergeQuestionnaireFromProfile(seed: unknown): ClientQuestionnaire {
  const q =
    (seed && typeof seed === "object" && "questionnaire" in seed
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

function capitalizeFirst(s: string): string {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function seasonLabel(s: string): string {
  if (s === "авто") return "Авто (по дате)";
  return capitalizeFirst(s);
}

function mealsPerDayPhrase(mealsPerDay: number): string {
  const n = Math.max(0, Math.round(mealsPerDay));
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word: string;
  if (mod10 === 1 && mod100 !== 11) word = "приём пищи";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    word = "приёма пищи";
  else word = "приёмов пищи";
  return `${n} ${word} в день`;
}

function supportPreviewByTone(tone: SupportTone): string {
  switch (tone) {
    case "мягкий":
      return "Начинаем спокойно. Один маленький шаг уже считается прогрессом.";
    case "нейтральный":
      return "Старт программы готов. Выполните первый день в удобном темпе.";
    case "бодрый":
      return "Отличный старт! Сегодня делаем первый шаг к результату.";
  }
}

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-medium leading-snug text-slate-900">
        {value || "—"}
      </p>
    </div>
  );
}

const MEDICAL_PREVIEW_NOTE =
  "Вы указали медицинские особенности. Программа предложит только общие мягкие рекомендации и привычки, без лечебного рациона.";

export function BuildingProgramPage({ mock, navigate }: PageProps) {
  const q = useMemo(
    () => mergeQuestionnaireFromProfile(mock.user.profile),
    [mock.user.profile],
  );

  const [assembled, setAssembled] = useState(false);

  const name =
    q.basics.firstName.trim() ||
    (typeof mock.user.profile === "object" &&
    mock.user.profile &&
    "clientName" in mock.user.profile
      ? String(
          (mock.user.profile as { clientName?: string }).clientName ?? "",
        ).trim()
      : "") ||
    "—";

  const showMedicalNote = q.medicalParticularities.hasMedicalParticularities;

  const programDurationDays = q.goalAndDuration.programDurationDays;
  const supportPreview = supportPreviewByTone(
    q.habitsDifficultiesAndSupport.preferredSupportTone,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Сборка программы
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Проверьте основные данные. На их основе программа соберёт персональную
          программу питания, привычек и ежедневных заданий.
        </p>
      </header>

      {showMedicalNote ? (
        <div
          className="rounded-xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-950"
          role="note"
        >
          {MEDICAL_PREVIEW_NOTE}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <PreviewCard label="Имя клиента" value={name} />
        <PreviewCard label="Цель" value={q.goalAndDuration.primaryGoal} />
        <PreviewCard
          label="Срок программы"
          value={`${q.goalAndDuration.programDurationDays} дней`}
        />
        <PreviewCard label="Город / регион" value={q.basics.cityOrRegion} />
        <PreviewCard
          label="Бюджет"
          value={capitalizeFirst(q.budgetSeasonAndAvailability.foodBudget)}
        />
        <PreviewCard
          label="Сезон"
          value={seasonLabel(q.budgetSeasonAndAvailability.season)}
        />
        <PreviewCard
          label="Доступность продуктов"
          value={capitalizeFirst(
            q.budgetSeasonAndAvailability.productAvailability,
          )}
        />
        <PreviewCard
          label="Количество приёмов пищи"
          value={String(q.foodAndProducts.mealsPerDay)}
        />
        <PreviewCard
          label="Уровень активности"
          value={capitalizeFirst(q.dayScheduleAndWork.activityLevel)}
        />
        <PreviewCard
          label="Комфортный тон сопровождения"
          value={capitalizeFirst(
            q.habitsDifficultiesAndSupport.preferredSupportTone,
          )}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        {!assembled ? (
          <button
            type="button"
            onClick={() => setAssembled(true)}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            Собрать программу
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => navigate("dashboard")}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
        >
          Перейти к главному экрану
        </button>
      </div>

      {assembled ? (
        <section
          role="status"
          aria-labelledby="program-ready-heading"
          className="rounded-xl border border-green-200/80 bg-green-50/90 px-4 py-4 text-green-950 shadow-sm sm:px-5 sm:py-5"
        >
          <h2
            id="program-ready-heading"
            className="text-lg font-semibold tracking-tight text-green-950"
          >
            Программа готова
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-green-900/95">
            Мы собрали стартовый план на основе анкеты. Проверьте первый день и
            переходите к прохождению.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PreviewCard
              label="День"
              value={`День 1 из ${programDurationDays}`}
            />
            <PreviewCard label="Цель" value={q.goalAndDuration.primaryGoal} />
            <PreviewCard
              label="Питание"
              value={mealsPerDayPhrase(q.foodAndProducts.mealsPerDay)}
            />
            <PreviewCard
              label="Привычка дня"
              value="Стакан воды утром"
            />
            <PreviewCard
              label="Задание дня"
              value="Добавить порцию овощей к одному приёму пищи"
            />
            <PreviewCard label="Поддержка" value={supportPreview} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
