import { useState } from "react";
import type { PageProps } from "./pageProps";

export function SettingsPage({ mock, navigate }: PageProps) {
  const { settings } = mock.user;
  const v = mock.content.contentVersion;
  const [devMessage, setDevMessage] = useState<string | null>(null);
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
        <li>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("nutrition.dailyActuals");
              setDevMessage("Выполненные дни очищены");
            }}
            className="w-full rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 hover:bg-amber-100"
          >
            Очистить выполненные дни
          </button>
        </li>
      </ul>
      {devMessage ? (
        <p className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {devMessage}
        </p>
      ) : null}
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
