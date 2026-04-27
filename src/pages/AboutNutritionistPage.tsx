import type { PageProps } from "./pageProps";

export function AboutNutritionistPage({ mock }: PageProps) {
  const { branding } = mock.content;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">О нутрициологе</h1>
      <p className="text-lg font-medium text-slate-900">{branding.nutritionistName}</p>
      <p className="text-slate-600">{branding.approach}</p>
      <p className="text-sm text-slate-500">Контакты: {branding.contacts}</p>
    </div>
  );
}
