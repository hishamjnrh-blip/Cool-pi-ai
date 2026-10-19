
import "dotenv/config";
import { searchDuckDuckGo } from "./search.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `
You are Cool pi AI, a helpful and intelligent AI assistant.

You understand Hausa, English, and Nigerian Pidgin.
Reply in the same language the user uses whenever possible.
Understand Nigerian cultural context.
Be respectful and helpful. Do not invent facts.
If you are uncertain, say so. Never claim to be human.

If web lookup information is provided, use it carefully.
Do not claim information is current unless the sources support that.
If the lookup does not contain the answer, say so rather than
pretending you searched the full internet.
`;

export async function generateAIResponse(
  message: string,
  history: ChatMessage[] = []
): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl =
    process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL;

  if (!apiKey) throw new Error("AI_API_KEY is not configured");
  if (!model) throw new Error("AI_MODEL is not configured");

  let userContent = message;

  // Attempt a free DuckDuckGo Instant Answer lookup.
  try {
    const lookup = await searchDuckDuckGo(message);

    if (lookup) {
      userContent =
        `${message}\n\n` +
        `DuckDuckGo Instant Answer information (may be incomplete):\n` +
        `${lookup}\n\n` +
        `If useful, cite the source URLs provided above.`;
    }
  } catch (error) {
    console.error("DuckDuckGo lookup failed:", error);
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-20),
    { role: "user", content: userContent }
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
    console.error("AI provider error:", response.status, errorText);
    throw new Error("AI provider request failed");
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("AI provider returned an empty response");
  }

  return reply;
}

