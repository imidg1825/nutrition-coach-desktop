import type { PageProps } from "./pageProps";

export function DayPage({ mock }: PageProps) {
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
      <button
        type="button"
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Отметить день выполненным
      </button>
      <p className="rounded-md bg-surface-muted p-3 text-sm text-slate-600">
        Мягкий итог дня после выполнения появится здесь (мок).
      </p>
    </div>
  );
}
