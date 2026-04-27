import { useState } from "react";
import type { PageProps } from "./pageProps";

export function DayPage({ mock, navigate }: PageProps) {
  const [dayCompleted, setDayCompleted] = useState(false);
  const { program, coachState } = mock.user;
  const rec = mock.content.recommendations.items[0];
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">День {program.currentDay}</h1>
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
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-800">Рекомендация:</span>{" "}
        {rec?.text}
      </p>
      {!dayCompleted ? (
        <button
          type="button"
          onClick={() => setDayCompleted(true)}
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
