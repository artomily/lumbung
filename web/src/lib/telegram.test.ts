import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendOwnerMessage } from "./telegram";
import { env } from "@/lib/env";

describe("telegram sendOwnerMessage", () => {
  const envRecord = env as unknown as Record<string, unknown>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns false as a no-op when credentials are missing", async () => {
    const originalToken = env.TELEGRAM_BOT_TOKEN;
    const originalChat = env.TELEGRAM_OWNER_CHAT_ID;
    envRecord.TELEGRAM_BOT_TOKEN = undefined;
    envRecord.TELEGRAM_OWNER_CHAT_ID = undefined;

    const result = await sendOwnerMessage("hello");
    expect(result).toBe(false);

    envRecord.TELEGRAM_BOT_TOKEN = originalToken;
    envRecord.TELEGRAM_OWNER_CHAT_ID = originalChat;
  });

  it("sends message and returns true on 200 ok response", async () => {
    const originalToken = env.TELEGRAM_BOT_TOKEN;
    const originalChat = env.TELEGRAM_OWNER_CHAT_ID;
    envRecord.TELEGRAM_BOT_TOKEN = "test-bot-token";
    envRecord.TELEGRAM_OWNER_CHAT_ID = "12345678";

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await sendOwnerMessage("Test alert");
    expect(result).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/bottest-bot-token/sendMessage",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: "12345678", text: "Test alert" }),
      }),
    );

    envRecord.TELEGRAM_BOT_TOKEN = originalToken;
    envRecord.TELEGRAM_OWNER_CHAT_ID = originalChat;
  });

  it("returns false when telegram API returns non-ok status", async () => {
    const originalToken = env.TELEGRAM_BOT_TOKEN;
    const originalChat = env.TELEGRAM_OWNER_CHAT_ID;
    envRecord.TELEGRAM_BOT_TOKEN = "test-bot-token";
    envRecord.TELEGRAM_OWNER_CHAT_ID = "12345678";

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, description: "Bad Request" }), {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await sendOwnerMessage("Test alert");
    expect(result).toBe(false);

    envRecord.TELEGRAM_BOT_TOKEN = originalToken;
    envRecord.TELEGRAM_OWNER_CHAT_ID = originalChat;
  });
});
