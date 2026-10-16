import { env } from "@/lib/env";

/**
 * Sends a message to the owner via Telegram Bot API.
 * No-op returning false if TELEGRAM_BOT_TOKEN or TELEGRAM_OWNER_CHAT_ID is not configured.
 */
export async function sendOwnerMessage(text: string): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_OWNER_CHAT_ID;

  if (!token || !chatId) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    if (!response.ok) {
      console.warn(`[telegram] sendMessage failed with HTTP ${response.status}: ${response.statusText}`);
      return false;
    }

    const payload = (await response.json()) as { ok?: boolean; description?: string };
    if (!payload.ok) {
      console.warn(`[telegram] sendMessage returned ok=false: ${payload.description ?? "unknown error"}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[telegram] Failed to send owner message:", error);
    return false;
  }
}
