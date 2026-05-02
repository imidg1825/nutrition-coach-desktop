import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { callOpenRouterChat } from "../src/modules/ai/openRouterClient.ts";

const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;

if (!apiKey?.trim()) {
  console.error("OPENROUTER_API_KEY is required");
  process.exit(1);
}

async function main() {
  const reply = await callOpenRouterChat({
    apiKey: apiKey.trim(),
    model: "openrouter/free",
    messages: [
      {
        role: "system",
        content: "Ты — Олеся, нутрициолог. Отвечай мягко, коротко, по-русски.",
      },
      {
        role: "user",
        content:
          "Сегодня устала, весь день сидела за компьютером и вечером съела два пирожных. Что делать завтра?",
      },
    ],
  });

  console.log(reply);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
