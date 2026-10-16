import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

export const HMAC_MAX_AGE_SEC = 300;

/**
 * Computes HMAC-SHA256 of message with the given secret key, returned as lowercase hex.
 */
export function computeHmac(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

/**
 * Constant-time comparison of two hex-encoded strings.
 */
export function safeTimingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length || bufA.length === 0) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export type VerifyHmacOptions = {
  secret?: string;
  timestamp: string | number | null | undefined;
  signature: string | null | undefined;
  rawPayload: string;
  now?: number; // unix seconds
  maxAgeSec?: number;
};

export type VerifyHmacResult = {
  valid: boolean;
  error?: string;
};

/**
 * Verifies an HMAC signature from OWatch per docs/05-API.md.
 * Header format:
 * - X-Lumbung-Timestamp: unix seconds
 * - X-Lumbung-Signature: hex(HMAC_SHA256(secret, timestamp + "." + rawPayload))
 *
 * Rejects if:
 * - Timestamp is missing or not a valid number
 * - Timestamp differs from now by more than maxAgeSec (default 300s)
 * - Signature is missing or invalid
 * - Signature does not match expected HMAC using constant-time comparison
 */
export function verifyHmacSignature(opts: VerifyHmacOptions): VerifyHmacResult {
  const secret = opts.secret ?? env.OWATCH_WEBHOOK_SECRET;
  if (!secret) {
    return { valid: false, error: "OWATCH_WEBHOOK_SECRET is not configured" };
  }

  if (!opts.timestamp) {
    return { valid: false, error: "Missing timestamp" };
  }

  const tsNum = typeof opts.timestamp === "number" ? opts.timestamp : parseInt(opts.timestamp, 10);
  if (isNaN(tsNum) || tsNum <= 0) {
    return { valid: false, error: "Invalid timestamp format" };
  }

  if (!opts.signature) {
    return { valid: false, error: "Missing signature" };
  }

  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const maxAge = opts.maxAgeSec ?? HMAC_MAX_AGE_SEC;
  if (Math.abs(now - tsNum) > maxAge) {
    return { valid: false, error: `Timestamp ${tsNum} is outside allowed window of ${maxAge}s (current: ${now})` };
  }

  const message = `${tsNum}.${opts.rawPayload}`;
  const expectedSig = computeHmac(secret, message);

  if (!safeTimingSafeEqual(opts.signature.toLowerCase(), expectedSig.toLowerCase())) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true };
}
