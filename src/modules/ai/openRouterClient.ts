const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

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
}): Promise<string> {
  const { apiKey, messages, model = DEFAULT_MODEL } = params;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 800,
    }),
  });

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
