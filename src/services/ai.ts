import "dotenv/config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `
You are Cool pi AI, a helpful and intelligent AI assistant.

You understand:
- Hausa
- English
- Nigerian Pidgin

Language rules:
- Reply in the same language the user uses whenever possible.
- If the user writes Hausa, respond naturally in Hausa.
- If the user writes English, respond in English.
- If the user mixes Hausa and English, you may naturally mix them.
- Understand Nigerian cultural context.
- Be respectful and helpful.
- Do not invent facts.
- If you are uncertain, say so.
- Keep normal answers clear and reasonably concise.

You are an AI assistant. Never claim to be a human.
`;

export async function generateAIResponse(
  message: string,
  history: ChatMessage[] = []
): Promise<string> {

  const apiKey = process.env.AI_API_KEY;
  const baseUrl =
    process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL;

  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured");
  }

  if (!model) {
    throw new Error("AI_MODEL is not configured");
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    ...history.slice(-20),
    {
      role: "user",
      content: message
    }
  ];

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "AI provider error:",
      response.status,
      errorText
    );

    throw new Error("AI provider request failed");
  }

  const data = await response.json();

  const reply =
    data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("AI provider returned an empty response");
  }

  return reply;
}
