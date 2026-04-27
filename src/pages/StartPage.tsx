import type { PageProps } from "./pageProps";

export function StartPage({ mock, navigate }: PageProps) {
  const { branding, contentVersion } = mock.content;
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">
        {branding.nutritionistName}
      </h1>
      <p className="text-slate-600">{branding.welcome}</p>
      <p className="text-sm text-slate-500">{branding.programShortDescription}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate("questionnaire")}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Начать программу
        </button>
        {mock.hasProgram ? (
          <button
            type="button"
            onClick={() => navigate("dashboard")}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-surface-muted"
          >
            Продолжить
          </button>
        ) : null}
      </div>
      <dl className="grid gap-2 rounded-lg border border-slate-200 bg-surface-muted/60 p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Статус сети</dt>
          <dd>{mock.isOnline ? "Онлайн" : "Офлайн"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Версия материалов</dt>
          <dd className="font-mono">{contentVersion.version}</dd>
        </div>
      </dl>
    </div>
  );
}
