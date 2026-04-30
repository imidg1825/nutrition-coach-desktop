import type { PageProps } from "./pageProps";

export function AboutNutritionistPage({ mock }: PageProps) {
  const { branding } = mock.content;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">О нутрициологе</h1>
      <p className="text-lg font-medium text-slate-900">{branding.nutritionistName}</p>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700">
        <p>Всем привет! Меня зовут Олеся.</p>
        <p>
          Я дипломированный нутрициолог и дипломированный фармацевт. Для меня
          крайне важен научный, доказательный подход к вопросам здоровья и
          питания.
        </p>
        <p className="font-medium text-slate-900">Почему вы можете мне доверять?</p>
        <p>
          По первому образованию я фармацевт с 10-летним опытом работы в
          аптеке, последние годы - в должности заведующей аптекой.
        </p>
        <p>
          Я изнутри знаю, как работают лекарства, как они взаимодействуют друг
          с другом и с пищей, и почему иногда они не дают желаемого эффекта.
        </p>
        <p>
          Именно работа с людьми, которые годами не могли найти решение своих
          проблем, подтолкнула меня к изучению нутрициологии. Я поняла, что
          часто ключ к здоровью - не в добавлении новой таблетки, а в поиске
          корня проблемы.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p className="font-medium text-slate-900">
          Связь со мной и запись на консультацию:
        </p>
        <p>
          Telegram:{" "}
          <a
            href="https://t.me/Olesya_nutrifarma"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2 hover:opacity-90"
          >
            @Olesya_nutrifarma
          </a>
        </p>
        <p>
          Канал:{" "}
          <a
            href="https://t.me/nutri_farma"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2 hover:opacity-90"
          >
            https://t.me/nutri_farma
          </a>
        </p>
      </div>
    </div>
  );
}
