import { useState } from "react";
import {
  questionnaireDefaults,
  type ClientQuestionnaire,
} from "../modules/questionnaire";
import type { PageProps } from "./pageProps";

const PROGRAM_SESSION_STORAGE_KEY = "nutrition.programSession";

type ProgramSessionSnapshot = {
  currentDay?: number;
  totalDays?: number;
};

function readProgramSessionSnapshot(): ProgramSessionSnapshot {
  try {
    const raw = localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const p = parsed as ProgramSessionSnapshot;
    return {
      currentDay:
        typeof p.currentDay === "number" && p.currentDay > 0
          ? Math.floor(p.currentDay)
          : undefined,
      totalDays:
        typeof p.totalDays === "number" && p.totalDays > 0
          ? Math.floor(p.totalDays)
          : undefined,
    };
  } catch {
    return {};
  }
}

function completeDayInProgramSession(): { currentDay: number; totalDays: number } {
  const fallback = { currentDay: 1, totalDays: 14 };
  try {
    const raw = localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    const parsed: Record<string, unknown> =
      raw && typeof JSON.parse(raw) === "object" && JSON.parse(raw) !== null
        ? (JSON.parse(raw) as Record<string, unknown>)
        : {};
    const currentDay =
      typeof parsed.currentDay === "number" && parsed.currentDay > 0
        ? Math.floor(parsed.currentDay)
        : fallback.currentDay;
    const totalDays =
      typeof parsed.totalDays === "number" && parsed.totalDays > 0
        ? Math.floor(parsed.totalDays)
        : fallback.totalDays;
    const nextDay = Math.min(currentDay + 1, totalDays);
    const nextSession = {
      ...parsed,
      currentDay: nextDay,
      totalDays,
      currentScreen: "day",
    };
    localStorage.setItem(PROGRAM_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    return { currentDay: nextDay, totalDays };
  } catch {
    return fallback;
  }
}

function mergeQuestionnaireFromProfile(seed: unknown): ClientQuestionnaire {
  const q =
    seed && typeof seed === "object" && "questionnaire" in seed
      ? (seed as { questionnaire?: Partial<ClientQuestionnaire> }).questionnaire
      : undefined;
  return {
    basics: { ...questionnaireDefaults.basics, ...q?.basics },
    goalAndDuration: {
      ...questionnaireDefaults.goalAndDuration,
      ...q?.goalAndDuration,
    },
    medicalParticularities: {
      ...questionnaireDefaults.medicalParticularities,
      ...q?.medicalParticularities,
    },
    dayScheduleAndWork: {
      ...questionnaireDefaults.dayScheduleAndWork,
      ...q?.dayScheduleAndWork,
    },
    foodAndProducts: {
      ...questionnaireDefaults.foodAndProducts,
      ...q?.foodAndProducts,
    },
    budgetSeasonAndAvailability: {
      ...questionnaireDefaults.budgetSeasonAndAvailability,
      ...q?.budgetSeasonAndAvailability,
    },
    habitsDifficultiesAndSupport: {
      ...questionnaireDefaults.habitsDifficultiesAndSupport,
      ...q?.habitsDifficultiesAndSupport,
    },
    cookingHabitsAndMethods: q?.cookingHabitsAndMethods
      ? {
          ...questionnaireDefaults.cookingHabitsAndMethods,
          ...q.cookingHabitsAndMethods,
        }
      : undefined,
  };
}

export function DayPage({
  mock,
  navigate,
  clientQuestionnaire,
}: PageProps & { clientQuestionnaire: ClientQuestionnaire | null }) {
  const [dayCompleted, setDayCompleted] = useState(false);
  const initialSession = readProgramSessionSnapshot();
  const [sessionCurrentDay, setSessionCurrentDay] = useState(
    initialSession.currentDay ?? mock.user.program.currentDay,
  );
  const [sessionTotalDays] = useState(
    initialSession.totalDays ?? mock.user.program.totalDays,
  );
  const { coachState } = mock.user;
  const q = clientQuestionnaire ?? mergeQuestionnaireFromProfile(mock.user.profile);
  const mealsPerDay = q.foodAndProducts.mealsPerDay;
  const snacksAndTiming = q.foodAndProducts.snacksAndTiming.trim();
  const goalText = `${q.goalAndDuration.primaryGoal} ${q.goalAndDuration.desiredOutcome}`.toLowerCase();
  const weightLossGoal =
    goalText.includes("похуд") ||
    goalText.includes("снизить вес") ||
    goalText.includes("минус") ||
    goalText.includes("кг") ||
    goalText.includes("килограмм");
  const hasMedicalData =
    q.medicalParticularities.hasMedicalParticularities ||
    [
      q.medicalParticularities.medicalParticularitiesDescription,
      q.medicalParticularities.foodAllergies,
      q.medicalParticularities.intolerances,
      q.medicalParticularities.medicalDietaryRestrictions,
    ].some((v) => v.trim().length > 0);
  const rec = mock.content.recommendations.items[0];
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">
        День {sessionCurrentDay} из {sessionTotalDays}
      </h1>
      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <p>
          <span className="text-slate-500">Настрой дня:</span>{" "}
          {coachState.dayMood}
        </p>
        <p>
          <span className="text-slate-500">Фокус дня:</span> {coachState.dayTask}
        </p>
        <p>
          <span className="text-slate-500">Привычка дня:</span>{" "}
          {coachState.dayHabit}
        </p>
        <p>
          <span className="text-slate-500">Задание дня:</span>{" "}
          {coachState.dayTask}
        </p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-800">Чек-лист</h2>
        <ul className="list-inside list-disc text-sm text-slate-700">
          <li>Вода утром</li>
          <li>Овощи к обеду</li>
          <li>Короткая прогулка</li>
        </ul>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-800">
          Питание на сегодня
        </h2>
        {hasMedicalData ? (
          <p className="mb-2 text-sm text-slate-600">
            Питание показано в мягком режиме с учётом указанных ограничений.
          </p>
        ) : null}
        {weightLossGoal ? (
          <p className="mb-2 text-sm text-slate-600">
            Порции умеренные, перекусы небольшие.
          </p>
        ) : null}
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>
            <span className="font-medium">Завтрак:</span> овсянка на воде с
            яблоком.
          </li>
          <li>
            <span className="font-medium">Обед:</span> гречка с курицей и
            овощами.
          </li>
          <li>
            <span className="font-medium">Ужин:</span> рыба или птица с
            тушёными овощами.
          </li>
        </ul>
        {mealsPerDay > 3 ? (
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            {snacksAndTiming ? (
              weightLossGoal ? (
                <>
                  <p>
                    <span className="font-medium">Текущий перекус:</span>{" "}
                    {snacksAndTiming}
                  </p>
                  <p>
                    <span className="font-medium">Мягкая замена:</span> фрукт,
                    яйцо, овощи или чай без сахара
                  </p>
                </>
              ) : (
                <p>
                  <span className="font-medium">Перекус:</span>{" "}
                  {snacksAndTiming}
                </p>
              )
            ) : (
              <p>
                <span className="font-medium">Перекус:</span> фрукт, яйцо или
                чай без сахара
              </p>
            )}
            {mealsPerDay > 4 ? (
              <p>
                <span className="font-medium">Второй перекус:</span> овощи,
                яйцо или чай без сахара
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-800">Рекомендация:</span>{" "}
        {rec?.text}
      </p>
      {!dayCompleted ? (
        <button
          type="button"
          onClick={() => {
            setDayCompleted(true);
            const next = completeDayInProgramSession();
            setSessionCurrentDay(next.currentDay);
          }}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Отметить день выполненным
        </button>
      ) : (
        <div className="space-y-4">
          <div
            role="status"
            className="rounded-xl border border-green-200/90 bg-green-50/90 px-4 py-3 text-sm leading-relaxed text-green-950"
          >
            День отмечен выполненным. Отличный старт — можно вернуться на
            главный экран или продолжить завтра.
          </div>
          <button
            type="button"
            onClick={() => navigate("dashboard")}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
          >
            Вернуться на главный экран
          </button>
          <button
            type="button"
            onClick={() => {
              setDayCompleted(false);
              const next = readProgramSessionSnapshot();
              setSessionCurrentDay(next.currentDay ?? sessionCurrentDay);
            }}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            {sessionCurrentDay <= 2 ? "Перейти ко дню 2" : "Перейти к следующему дню"}
          </button>
        </div>
      )}
      {!dayCompleted ? (
        <p className="rounded-md bg-surface-muted p-3 text-sm text-slate-600">
          Мягкий итог дня после выполнения появится здесь (мок).
        </p>
      ) : null}
    </div>
  );
}
