import { describe, it, expect } from "vitest";
import { computeHmac, verifyHmacSignature, safeTimingSafeEqual } from "./hmac";

describe("HMAC verification (web/src/lib/hmac.ts)", () => {
  const testSecret = "super-secret-test-key-32-bytes!!";
  const fixedNow = 1729000000;
  const rawBody = JSON.stringify({
    redeemId: "owr_01HZX99",
    userId: "u_42",
    wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    points: "500",
    amountMicro: "250000",
  });

  it("computes deterministic HMAC-SHA256 matching standard vector", () => {
    // RFC 4231 test vector 2:
    // Key: "Jefe" (0x4a656665)
    // Data: "what do ya want for nothing?"
    // Digest: 5bdcc146bf60754e6a042426cdb293170450fe07de8aa0e474f10e97d3a7b8de
    const rfcKey = "Jefe";
    const rfcData = "what do ya want for nothing?";
    const expected = "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843";
    expect(computeHmac(rfcKey, rfcData)).toBe(expected);
  });

  it("verifies a valid signature with timestamp within 300s window", () => {
    const timestamp = fixedNow;
    const signature = computeHmac(testSecret, `${timestamp}.${rawBody}`);

    const res = verifyHmacSignature({
      secret: testSecret,
      timestamp,
      signature,
      rawPayload: rawBody,
      now: fixedNow,
    });

    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("verifies when timestamp is within 300s in the past (e.g. 299s ago)", () => {
    const timestamp = fixedNow - 299;
    const signature = computeHmac(testSecret, `${timestamp}.${rawBody}`);

    const res = verifyHmacSignature({
      secret: testSecret,
      timestamp,
      signature,
      rawPayload: rawBody,
      now: fixedNow,
    });

    expect(res.valid).toBe(true);
  });

  it("verifies when timestamp is within 300s in the future (e.g. 60s ahead)", () => {
    const timestamp = fixedNow + 60;
    const signature = computeHmac(testSecret, `${timestamp}.${rawBody}`);

    const res = verifyHmacSignature({
      secret: testSecret,
      timestamp,
      signature,
      rawPayload: rawBody,
      now: fixedNow,
    });

    expect(res.valid).toBe(true);
  });

  it("rejects when timestamp is older than 300s (e.g. 301s ago)", () => {
    const timestamp = fixedNow - 301;
    const signature = computeHmac(testSecret, `${timestamp}.${rawBody}`);

    const res = verifyHmacSignature({
      secret: testSecret,
      timestamp,
      signature,
      rawPayload: rawBody,
      now: fixedNow,
    });

    expect(res.valid).toBe(false);
    expect(res.error).toContain("outside allowed window");
  });

  it("rejects when timestamp is more than 300s in the future", () => {
    const timestamp = fixedNow + 301;
    const signature = computeHmac(testSecret, `${timestamp}.${rawBody}`);

    const res = verifyHmacSignature({
      secret: testSecret,
      timestamp,
      signature,
      rawPayload: rawBody,
      now: fixedNow,
    });

    expect(res.valid).toBe(false);
    expect(res.error).toContain("outside allowed window");
  });

  it("rejects when payload has been tampered with", () => {
    const timestamp = fixedNow;
    const signature = computeHmac(testSecret, `${timestamp}.${rawBody}`);
    const tamperedBody = JSON.stringify({
      redeemId: "owr_01HZX99",
      userId: "u_42",
      wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      points: "500",
      amountMicro: "999999999", // tampered!
    });

    const res = verifyHmacSignature({
      secret: testSecret,
      timestamp,
      signature,
      rawPayload: tamperedBody,
      now: fixedNow,
    });

    expect(res.valid).toBe(false);
    expect(res.error).toBe("Invalid signature");
  });

  it("rejects when signature was signed with a different secret", () => {
    const timestamp = fixedNow;
    const wrongSignature = computeHmac("wrong-secret-key", `${timestamp}.${rawBody}`);

    const res = verifyHmacSignature({
      secret: testSecret,
      timestamp,
      signature: wrongSignature,
      rawPayload: rawBody,
      now: fixedNow,
    });

    expect(res.valid).toBe(false);
    expect(res.error).toBe("Invalid signature");
  });

  it("rejects when secret is missing or empty", () => {
    const res = verifyHmacSignature({
      secret: "",
      timestamp: fixedNow,
      signature: "abc",
      rawPayload: rawBody,
      now: fixedNow,
    });

    expect(res.valid).toBe(false);
    expect(res.error).toContain("not configured");
  });

  it("verifies GET request signature where payload is redeemId", () => {
    const redeemId = "owr_abc123";
    const timestamp = fixedNow;
    const signature = computeHmac(testSecret, `${timestamp}.${redeemId}`);

    const res = verifyHmacSignature({
      secret: testSecret,
      timestamp,
      signature,
      rawPayload: redeemId,
      now: fixedNow,
    });

    expect(res.valid).toBe(true);
  });

  it("constant-time comparison safely handles invalid hex or mismatched lengths", () => {
    expect(safeTimingSafeEqual("deadbeef", "deadbeef")).toBe(true);
    expect(safeTimingSafeEqual("deadbeef", "cafebabe")).toBe(false);
    expect(safeTimingSafeEqual("deadbeef", "dead")).toBe(false);
    expect(safeTimingSafeEqual("", "")).toBe(false);
    expect(safeTimingSafeEqual("not-hex", "not-hex")).toBe(false);
  });
});
