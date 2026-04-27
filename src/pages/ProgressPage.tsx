import type { PageProps } from "./pageProps";

export function ProgressPage({ mock }: PageProps) {
  const { progress, behavior } = mock.user;
  const completed = progress.completedDays.length;
  const skipped = progress.skippedDays.length;
  const hasSkips = skipped > 0;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Прогресс</h1>
      <dl className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Процент программы</dt>
          <dd className="font-semibold">{progress.progressPercent}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Выполнено дней</dt>
          <dd>{completed}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Пропущено дней</dt>
          <dd>{skipped}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Серия выполнений</dt>
          <dd>{progress.currentStreak}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-2">
          <dt className="text-slate-500">Сводка поведения (мок)</dt>
          <dd className="text-right text-xs text-slate-600">
            выполнено: {behavior.completedCount}, пропусков:{" "}
            {behavior.skippedCount}
          </dd>
        </div>
      </dl>
      {hasSkips ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950">
          Пропуски случаются — главное, что вы снова в программе. Один шаг
          сегодня уже возвращает ритм без давления и вины.
        </p>
      ) : null}
    </div>
  );
}
