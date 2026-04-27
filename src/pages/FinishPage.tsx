import type { PageProps } from "./pageProps";

export function FinishPage({ mock }: PageProps) {
  const { profile, program, progress } = mock.user;
  return (
    <div className="mx-auto max-w-lg space-y-4 text-center">
      <h1 className="text-xl font-semibold">Итог программы</h1>
      <p className="text-slate-600">
        {profile.clientName}, вы прошли {program.totalDays}-дневный план (мок).
      </p>
      <p className="text-3xl font-semibold text-accent">{progress.percent}%</p>
      <p className="text-sm text-slate-500">Итоговый экран по ТЗ — каркас.</p>
    </div>
  );
}
