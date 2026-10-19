
import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  generateAIResponse,
  ChatMessage
} from "./services/ai";

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET =
  process.env.TELEGRAM_WEBHOOK_SECRET;

// ========================================
// PERMANENT CONVERSATION MEMORY (SQLITE)
// ========================================

mkdirSync("data", { recursive: true });

const memoryDb = new DatabaseSync(
  join("data", "coolpi.sqlite")
);

memoryDb.exec(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL
      CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_chat_messages
  ON chat_messages(chat_id, id);
`);

function getChatHistory(chatId: number): ChatMessage[] {
  const rows = memoryDb.prepare(`
    SELECT role, content
    FROM chat_messages
    WHERE chat_id = ?
    ORDER BY id DESC
    LIMIT 20
  `).all(String(chatId)) as {
    role: "user" | "assistant";
    content: string;
  }[];

  return rows.reverse().map((row) => ({
    role: row.role,
    content: row.content
  }));
}

function saveChatMessage(
  chatId: number,
  role: "user" | "assistant",
  content: string
): void {
  memoryDb.prepare(`
    INSERT INTO chat_messages (chat_id, role, content)
    VALUES (?, ?, ?)
  `).run(String(chatId), role, content);
}

function resetChatHistory(chatId: number): void {
  memoryDb.prepare(`
    DELETE FROM chat_messages
    WHERE chat_id = ?
  `).run(String(chatId));
}

// ========================================
// EXPRESS API
// ========================================

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    service: "Cool pi AI",
    status: "online",
    timestamp: new Date().toISOString()
  });
});

const chatSchema = z.object({
  message: z.string().trim().min(1).max(8000),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string()
    })
  ).max(20).optional()
});

app.post("/api/chat", async (req, res) => {
  try {
    const parsed = chatSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Please provide a valid message."
        }
      });
    }

    const history: ChatMessage[] =
      parsed.data.history?.map((item) => ({
        role: item.role,
        content: item.content
      })) || [];

    const reply = await generateAIResponse(
      parsed.data.message,
      history
    );

    return res.json({
      success: true,
      reply
    });
  } catch (error) {
    console.error("Chat error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "AI_ERROR",
        message: "Cool pi AI could not generate a response."
      }
    });
  }
});

// ========================================
// TELEGRAM BOT API
// ========================================

async function telegramRequest(
  method: string,
  body: Record<string, unknown> = {}
): Promise<any> {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is not configured"
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  const data = await response.json() as {
    ok: boolean;
    result?: any;
    description?: string;
  };

  if (!response.ok || !data.ok) {
    throw new Error(
      `Telegram API error: ${data.description || response.status}`
    );
  }

  return data;
}

// ========================================
// TELEGRAM COMMANDS
// ========================================

async function handleTelegramCommand(
  command: string,
  chatId: number
): Promise<boolean> {
  if (command === "/start") {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text:
        "👋 Welcome to Cool Pi AI!\n\n" +
        "Your friendly AI assistant for questions, " +
        "learning, writing, and everyday tasks.\n\n" +
        "I support English, Hausa, and Nigerian Pidgin.\n\n" +
        "Sannu! Barka da zuwa Cool Pi AI!\n" +
        "Ni ne mataimakinka na AI.\n\n" +
        "Send me a message to get started.\n" +
        "Use /help to see the commands."
    });

    return true;
  }

  if (command === "/help") {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text:
        "📚 COOL PI AI — HELP\n\n" +
        "/start — Welcome message\n" +
        "/help — Show commands\n" +
        "/about — About Cool Pi AI\n" +
        "/reset — Clear your saved conversation\n\n" +
        "Send any question to chat with the AI.\n" +
        "Languages: English, Hausa, and Nigerian Pidgin."
    });

    return true;
  }

  if (command === "/about") {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text:
        "🤖 Cool Pi AI\n\n" +
        "An AI assistant for questions, learning, " +
        "writing, and everyday tasks.\n\n" +
        "Built to support English, Hausa, and " +
        "Nigerian Pidgin.\n\n" +
        "Powered by your configured AI provider."
    });

    return true;
  }

  if (command === "/reset") {
    resetChatHistory(chatId);

    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text:
        "🧹 Your saved conversation memory has been cleared.\n\n" +
        "An fara sabuwar hira! Za mu iya fara daga farko."
    });

    return true;
  }

  return false;
}

// ========================================

async function processTelegramWebhookMessage(message: any): Promise<void> {
  const chatId = message.chat?.id;
  const userText = message.text?.trim();

  if (!chatId || !userText) return;

  const command = userText.split(/\s+/)[0].split("@")[0].toLowerCase();

  if (command.startsWith("/") && await handleTelegramCommand(command, chatId)) {
    return;
  }

  try {
    await telegramRequest("sendChatAction", {
      chat_id: chatId,
      action: "typing"
    });

    const history = getChatHistory(chatId);
    const reply = await generateAIResponse(userText, history);

    saveChatMessage(chatId, "user", userText);
    saveChatMessage(chatId, "assistant", reply);

    for (let i = 0; i < reply.length; i += 4000) {
      await telegramRequest("sendMessage", {
        chat_id: chatId,
        text: reply.slice(i, i + 4000)
      });
    }
  } catch (error) {
    console.error("Telegram webhook message error:", error);
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: "Sorry, I couldn't process that message right now. Please try again."
    }).catch(() => undefined);
  }
}

app.post("/api/telegram/webhook", async (req, res) => {
  if (!TELEGRAM_WEBHOOK_SECRET) {
    res.status(503).json({ error: "Webhook secret is not configured" });
    return;
  }

  const suppliedSecret = req.header("X-Telegram-Bot-Api-Secret-Token");

  if (suppliedSecret !== TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const update = req.body;

  if (update?.message) {
    await processTelegramWebhookMessage(update.message);
  }

  res.sendStatus(200);
});

// WEBHOOK MODE — NO LONG POLLING
// ========================================

async function initializeTelegramBot(): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("Telegram bot: DISABLED");
    return;
  }

  try {
    const me = await telegramRequest("getMe");
    console.log(`Telegram bot: @${me.result.username} connected`);

    await telegramRequest("setMyCommands", {
      commands: [
        { command: "start", description: "Welcome to Cool Pi AI" },
        { command: "help", description: "View commands and instructions" },
        { command: "about", description: "Learn about Cool Pi AI" },
        { command: "reset", description: "Clear your conversation memory" }
      ]
    });

    console.log("Telegram command menu: REGISTERED");
    console.log("Webhook route ready; webhook registration is not automatic.");
  } catch (error) {
    console.error("Telegram initialization error:", error);
  }
}

// ========================================
// FALLBACK FOR UNKNOWN API ROUTES
// ========================================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Endpoint not found."
    }
  });
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
  console.log("");
  console.log("=================================");
  console.log("       COOL PI AI ONLINE");
  console.log("=================================");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Chat:   POST http://localhost:${PORT}/api/chat`);
  console.log("=================================");
  console.log("");
});

void initializeTelegramBot();
