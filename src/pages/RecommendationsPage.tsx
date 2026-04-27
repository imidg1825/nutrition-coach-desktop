import type { PageProps } from "./pageProps";

export function RecommendationsPage({ mock }: PageProps) {
  const items = mock.content.recommendations.items;
  const tips = mock.content.nutrition.tips;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Рекомендации</h1>
      <ul className="list-inside list-decimal space-y-2 text-slate-700">
        {items.map((item) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
      <h2 className="text-sm font-medium text-slate-800">Питание</h2>
      <ul className="list-inside list-disc text-sm text-slate-600">
        {tips.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
