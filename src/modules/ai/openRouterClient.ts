const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

/** Лимит ожидания ответа OpenRouter при сборке программы (один HTTP-запрос). */
export const OPEN_ROUTER_PROGRAM_TIMEOUT_MS = 28_000;

export type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionsResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export async function callOpenRouterChat(params: {
  apiKey: string;
  messages: OpenRouterMessage[];
  model?: string;
  /** По умолчанию 800; для больших JSON (полный план) задавайте выше. */
  maxTokens?: number;
  /**
   * Прерывает запрос через указанное время (мс).
   * Без значения таймаут не ставится (поведение как раньше).
   */
  timeoutMs?: number;
}): Promise<string> {
  const {
    apiKey,
    messages,
    model = DEFAULT_MODEL,
    maxTokens = 800,
    timeoutMs,
  } = params;

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs != null && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: maxTokens,
      }),
    });
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }

  if (!res.ok) {
    const bodyText = await res.text();
    const message = bodyText.trim()
      ? `OpenRouter request failed: ${res.status} ${res.statusText} — ${bodyText}`
      : `OpenRouter request failed: ${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  const data = (await res.json()) as ChatCompletionsResponse;
  const content = data.choices?.[0]?.message?.content;

  if (content == null || String(content).trim() === "") {
    throw new Error("OpenRouter returned empty response");
  }

  return String(content);
}
