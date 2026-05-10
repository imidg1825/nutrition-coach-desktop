import { useState } from "react";
import type { PageProps } from "./pageProps";

export function SettingsPage({ mock, navigate }: PageProps) {
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
            onClick={() => {
              try {
                localStorage.removeItem("nutrition.dailyActuals");
                localStorage.removeItem("nutrition.support.returnAfterBreak.shownAt");
                setDevMessage("Прогресс сброшен. Начинаем спокойно — Олеся рядом.");
              } catch {
                setDevMessage(
                  "Не получилось сбросить прогресс на этом устройстве. Попробуйте перезапустить приложение.",
                );
              }
            }}
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
      {devMessage ? (
        <p className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {devMessage}
        </p>
      ) : null}
      <dl className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Версия приложения</dt>
          <dd className="font-mono">{mock.appVersion}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Версия материалов</dt>
          <dd className="font-mono">{v.version}</dd>
        </div>
      </dl>
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
        <h2 className="font-semibold text-slate-900">Разработчик</h2>
        <p className="mt-2 text-slate-700">
          Приложение разработал Иван Мазницын.
        </p>
        <p className="mt-3 text-slate-600">Контакты:</p>
        <ul className="mt-1 list-inside list-disc space-y-1 text-slate-700">
          <li>
            Telegram:{" "}
            <a
              href="https://t.me/Ivan_Maznitsin"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              @Ivan_Maznitsin
            </a>
          </li>
          <li>
            GitHub:{" "}
            <a
              href="https://github.com/imidg1825"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              https://github.com/imidg1825
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
