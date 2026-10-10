import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { generateAIResponse, ChatMessage } from "./services/ai";

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ================================
// Health check
// ================================
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    service: "Cool pi AI",
    status: "online",
    timestamp: new Date().toISOString()
  });
});

// ================================
// AI chat API
// ================================
const chatSchema = z.object({
  message: z.string().trim().min(1).max(8000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string()
      })
    )
    .max(20)
    .optional()
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

// ================================
// Telegram helpers
// ================================
async function telegramRequest(
  method: string,
  body: Record<string, unknown> = {}
) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
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

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(
      `Telegram API error: ${JSON.stringify(data)}`
    );
  }

  return data;
}

// ================================
// Telegram bot
// ================================
async function startTelegramBot() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("Telegram bot: DISABLED");
    console.log("Set TELEGRAM_BOT_TOKEN to enable it.");
    return;
  }

  try {
    const me = await telegramRequest("getMe");

    console.log(
      `Telegram bot: @${me.result.username} connected`
    );

    // Remove any previous webhook so polling can work.
    await telegramRequest("deleteWebhook", {
      drop_pending_updates: false
    });

    let offset = 0;

    console.log("Telegram polling: ACTIVE");

    while (true) {
      try {
        const data = await telegramRequest("getUpdates", {
          offset,
          timeout: 30,
          allowed_updates: ["message"]
        });

        for (const update of data.result || []) {
          offset = update.update_id + 1;

          const message = update.message;

          if (!message?.text) {
            continue;
          }

          const chatId = message.chat.id;
          const userMessage = message.text.trim();

          if (!userMessage) {
            continue;
          }

          console.log(
            `Telegram message from ${message.from?.username || message.from?.first_name || "user"}: ${userMessage}`
          );

          try {
            await telegramRequest("sendChatAction", {
              chat_id: chatId,
              action: "typing"
            });

            const reply = await generateAIResponse(
              userMessage
            );

            await telegramRequest("sendMessage", {
              chat_id: chatId,
              text: reply
            });

          } catch (error) {
            console.error(
              "Telegram AI error:",
              error
            );

            await telegramRequest("sendMessage", {
              chat_id: chatId,
              text: "Sorry, I couldn't generate a response right now. Please try again."
            }).catch((sendError) => {
              console.error(
                "Telegram error message failed:",
                sendError
              );
            });
          }
        }

      } catch (error) {
        console.error(
          "Telegram polling error:",
          error
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 3000)
        );
      }
    }

  } catch (error) {
    console.error(
      "Telegram startup error:",
      error
    );
  }
}

// ================================
// 404 handler
// ================================
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Endpoint not found."
    }
  });
});

// ================================
// Start server
// ================================
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

startTelegramBot();
