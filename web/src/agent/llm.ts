import { env } from "@/lib/env";
import { normalizeForCanonicalJson } from "@/lib/canonical";
import { LlmDecisionSchema, type Action, type DecisionSnapshot, type LlmDecision, type RuleResult } from "./types";

export const LLM_SYSTEM_PROMPT = `You are Lumbung, the treasurer agent for OWatch, a watch-to-earn platform in Indonesia.
Your duties, in order: (1) never let the treasury become unable to honor viewers' points,
(2) pay legitimate viewers quickly, (3) protect the treasury from farming and abuse,
(4) escalate to the human owner only when it truly needs a human.
You will receive a JSON snapshot of the treasury, the liability from outstanding points,
the user's history, the hard-rule results, and the list of allowed actions.
Choose exactly ONE action from allowedActions. Prefer PAY for normal users when solvency is healthy.
Prefer HOLD when the issue may resolve on its own (e.g., top-up expected, daily cap resets).
Prefer ESCALATE when a human judgment is needed (unusual but plausibly legitimate).
Reply with JSON only, matching the schema. reasoning: max 3 sentences, plain English, cite the numbers you used.
recommendationIfEscalated: what you would do if you had the authority.`;

export type CallLlmResult = {
  decision: LlmDecision;
  llmModel: string;
};

/**
 * Fallback response when LLM is unavailable, times out, returns invalid JSON, or chooses an unallowed action.
 * Money-safety rule: Flow is always hard rules -> LLM -> executor. If LLM fails, action is always HOLD, never PAY.
 */
function createFallbackDecision(reason = "LLM unavailable or out-of-policy; held for safety"): LlmDecision {
  return {
    action: "HOLD",
    reasoning: reason,
    riskScore: 0.5,
    factors: ["fallback-hold"],
    holdUntilHint: "owner",
  };
}

/**
 * Calls OpenAI-compatible chat completions endpoint with the bounded prompt and schema.
 * Strict money safety:
 * 1. When LLM_BASE_URL is unset, returns action HOLD and llmModel 'rules-only' (NEVER PAY).
 * 2. On timeout (LLM_TIMEOUT_MS), invalid JSON, or schema mismatch, returns action HOLD and llmModel 'fallback'.
 * 3. Enforces that chosen action is strictly within allowedActions.
 */
export async function callLlm(
  snapshot: DecisionSnapshot,
  ruleResults: RuleResult[],
  allowedActions: Action[],
): Promise<CallLlmResult> {
  // If LLM_BASE_URL is unset or empty -> rules-only mode, NEVER PAY
  if (!env.LLM_BASE_URL || env.LLM_BASE_URL.trim() === "") {
    return {
      decision: {
        action: "HOLD",
        reasoning: "LLM endpoint unset; held for safety",
        riskScore: 0,
        factors: ["rules-only"],
        holdUntilHint: "owner",
      },
      llmModel: "rules-only",
    };
  }

  const modelName = env.LLM_MODEL || "default-model";
  const baseUrl = env.LLM_BASE_URL.trim();
  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const userPayload = {
    snapshot: normalizeForCanonicalJson(snapshot),
    ruleResults,
    allowedActions,
  };

  try {
    const timeoutMs = env.LLM_TIMEOUT_MS || 12000;
    const signal = AbortSignal.timeout(timeoutMs);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (env.LLM_API_KEY) {
      headers["Authorization"] = `Bearer ${env.LLM_API_KEY}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelName,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: LLM_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
      }),
      signal,
    });

    if (!response.ok) {
      console.warn(`[llm] LLM call returned HTTP ${response.status}: ${response.statusText}`);
      return {
        decision: createFallbackDecision(),
        llmModel: "fallback",
      };
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      console.warn("[llm] LLM response choices missing text content");
      return {
        decision: createFallbackDecision(),
        llmModel: "fallback",
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      console.warn("[llm] LLM returned non-JSON string:", rawContent);
      return {
        decision: createFallbackDecision(),
        llmModel: "fallback",
      };
    }

    const parseResult = LlmDecisionSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      console.warn("[llm] LLM output failed schema validation:", parseResult.error.format());
      return {
        decision: createFallbackDecision(),
        llmModel: "fallback",
      };
    }

    const parsedDecision = parseResult.data;

    // Strict boundary enforcement: action must be in allowedActions
    if (!allowedActions.includes(parsedDecision.action)) {
      console.warn(
        `[llm] LLM chose action "${parsedDecision.action}" which is not in allowedActions (${allowedActions.join(", ")})`,
      );
      return {
        decision: createFallbackDecision(),
        llmModel: "fallback",
      };
    }

    return {
      decision: parsedDecision,
      llmModel: modelName,
    };
  } catch (err) {
    console.warn("[llm] LLM request error (timeout or network):", err);
    return {
      decision: createFallbackDecision(),
      llmModel: "fallback",
    };
  }
}
