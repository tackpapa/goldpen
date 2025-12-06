import { Hono } from "hono";
import type { Env } from "../env";

const app = new Hono<{ Bindings: Env }>();

// POST /api/telegram/send - 텔레그램 메시지 전송
app.post("/send", async (c) => {
  const env = c.env;

  try {
    const body = await c.req.json() as { message: string };
    const { message } = body;

    if (!message || message.trim().length === 0) {
      return c.json({ error: "message is required" }, 400);
    }

    const botToken = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.log("[Telegram] No token/chatId configured");
      return c.json({ error: "Telegram not configured" }, 500);
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    const result = (await response.json()) as { ok: boolean; description?: string };

    if (result.ok) {
      console.log("[Telegram] Message sent successfully");
      return c.json({ success: true });
    }

    console.error("[Telegram] API error:", result);
    return c.json(
      { success: false, error: result.description || "Telegram API error" },
      500
    );
  } catch (error) {
    console.error("[Telegram] Error:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default app;
