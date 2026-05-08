import type { PageProps } from "./pageProps";

export function UpdatesPage({ mock, isOnline }: PageProps & { isOnline: boolean }) {
  const { contentVersion, changelog } = mock.content;
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Обновления и материалы</h1>
      <dl className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Версия материалов</dt>
          <dd className="font-mono">{contentVersion.version}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Дата последнего обновления</dt>
          <dd>{contentVersion.lastUpdated}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Статус</dt>
          <dd>{isOnline ? "Онлайн" : "Офлайн"}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-surface-muted"
      >
        Проверить обновления
      </button>
      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-800">Что нового</h2>
        <ul className="space-y-2">
          {changelog.entries.map((e, i) => (
            <li
              key={i}
              className="rounded-md border border-slate-100 bg-surface-muted/50 p-3 text-sm"
            >
              <span className="font-medium">{e.date}</span> — {e.title}: {e.body}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
