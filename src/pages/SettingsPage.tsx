import type { PageProps } from "./pageProps";

export function SettingsPage({ mock, navigate }: PageProps) {
  const { settings } = mock.user;
  const v = mock.content.contentVersion;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Настройки</h1>
      <ul className="space-y-2">
        <li>
          <button
            type="button"
            className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-left text-sm hover:bg-surface-muted"
          >
            Изменить анкету
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => navigate("building")}
            className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-left text-sm hover:bg-surface-muted"
          >
            Пересобрать программу
          </button>
        </li>
        <li>
          <button
            type="button"
            className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-left text-sm hover:bg-surface-muted"
          >
            Сбросить прогресс
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => navigate("updates")}
            className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-left text-sm hover:bg-surface-muted"
          >
            Проверить обновления
          </button>
        </li>
      </ul>
      <dl className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div>
          <dt className="text-slate-500">Путь к локальным данным</dt>
          <dd className="mt-1 font-mono text-xs break-all">{settings.localDataPath}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Версия приложения</dt>
          <dd className="font-mono">{mock.appVersion}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Версия материалов</dt>
          <dd className="font-mono">{v.version}</dd>
        </div>
      </dl>
    </div>
  );
}
