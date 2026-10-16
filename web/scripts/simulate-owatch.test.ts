import { describe, it, expect } from "vitest";
import {
  buildSignedHeaders,
  buildGetHeaders,
  buildRedeemPayload,
  buildSnapshotPayload,
} from "./simulate-owatch";
import { verifyHmacSignature, computeHmac } from "../src/lib/hmac";

describe("simulate-owatch: payload builders & HMAC signing", () => {
  const secret = "test_webhook_secret_1234567890abcdef";

  describe("buildSignedHeaders", () => {
    it("creates headers with timestamp and valid HMAC-SHA256 signature", () => {
      const payload = JSON.stringify({ hello: "world" });
      const now = 1729000000;
      const headers = buildSignedHeaders(secret, payload, now);

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["X-Lumbung-Timestamp"]).toBe("1729000000");
      expect(headers["X-Lumbung-Signature"]).toBe(
        computeHmac(secret, `1729000000.${payload}`),
      );

      // Verify with the official Lumbung HMAC verifier
      const verification = verifyHmacSignature({
        secret,
        timestamp: headers["X-Lumbung-Timestamp"],
        signature: headers["X-Lumbung-Signature"],
        rawPayload: payload,
        now,
      });

      expect(verification.valid).toBe(true);
    });

    it("fails verification if payload is modified", () => {
      const payload = JSON.stringify({ hello: "world" });
      const headers = buildSignedHeaders(secret, payload);

      const tamperedPayload = JSON.stringify({ hello: "tampered" });
      const verification = verifyHmacSignature({
        secret,
        timestamp: headers["X-Lumbung-Timestamp"],
        signature: headers["X-Lumbung-Signature"],
        rawPayload: tamperedPayload,
      });

      expect(verification.valid).toBe(false);
      expect(verification.error).toBe("Invalid signature");
    });
  });

  describe("buildGetHeaders", () => {
    it("creates valid HMAC headers for GET /api/owatch/redeem/:redeemId", () => {
      const redeemId = "owr_demo_test_123";
      const now = 1729000500;
      const headers = buildGetHeaders(secret, redeemId, now);

      expect(headers["X-Lumbung-Timestamp"]).toBe("1729000500");
      expect(headers["X-Lumbung-Signature"]).toBe(
        computeHmac(secret, `1729000500.${redeemId}`),
      );

      // Verify with the official Lumbung HMAC verifier using redeemId as rawPayload
      const verification = verifyHmacSignature({
        secret,
        timestamp: headers["X-Lumbung-Timestamp"],
        signature: headers["X-Lumbung-Signature"],
        rawPayload: redeemId,
        now,
      });

      expect(verification.valid).toBe(true);
    });
  });

  describe("buildRedeemPayload", () => {
    it("always sets source strictly to 'simulator'", () => {
      const payload = buildRedeemPayload({
        redeemId: "owr_test_01",
        userId: "u_test_user",
        wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        points: "500",
        amountMicro: "250000",
      });

      expect(payload.source).toBe("simulator");
      expect(payload.redeemId).toBe("owr_test_01");
      expect(payload.amountMicro).toBe("250000");
      expect(payload.points).toBe("500");
    });

    it("attaches optional user history details when provided", () => {
      const createdAt = new Date().toISOString();
      const payload = buildRedeemPayload({
        redeemId: "owr_test_02",
        userId: "u_test_user_2",
        wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        points: "1000",
        amountMicro: "500000",
        user: {
          accountCreatedAt: createdAt,
          pointsEarned7d: "2500",
        },
      });

      expect(payload.user?.accountCreatedAt).toBe(createdAt);
      expect(payload.user?.pointsEarned7d).toBe("2500");
    });
  });

  describe("buildSnapshotPayload", () => {
    it("generates default snapshot with valid ISO asOf datetime", () => {
      const snap = buildSnapshotPayload();
      expect(snap.pointsOutstanding).toBe("20000");
      expect(snap.microUsdcPerPoint).toBe("500");
      expect(new Date(snap.asOf).toISOString()).toBe(snap.asOf);
    });

    it("allows overrides for low-reserve simulation", () => {
      const snap = buildSnapshotPayload({
        pointsOutstanding: "300000",
        activeUsers7d: 500,
      });
      expect(snap.pointsOutstanding).toBe("300000");
      expect(snap.activeUsers7d).toBe(500);
      expect(snap.microUsdcPerPoint).toBe("500");
    });
  });
});
