import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/public/stats", () => {
  it("returns 200 with public stats JSON and cache control", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("public, s-maxage=30");

    const data = await res.json();
    expect(data.network).toMatch(/^arc-(testnet|mainnet)$/);
    expect(data).toHaveProperty("vault");
    expect(data.vault).toHaveProperty("balanceMicro");
    expect(typeof data.vault.balanceMicro).toBe("string");
    expect(data.vault).toHaveProperty("remainingToday");
    expect(typeof data.vault.remainingToday.REWARD).toBe("string");
    expect(typeof data.vault.remainingToday.CREATOR).toBe("string");
    expect(typeof data.vault.remainingToday.OPS).toBe("string");

    expect(data).toHaveProperty("solvency");
    expect(typeof data.solvency.reserveRatio).toBe("number");
    expect(typeof data.solvency.liabilityMicro).toBe("string");

    expect(data).toHaveProperty("traction");
    expect(data.traction.businesses).toBe(1);
    expect(typeof data.traction.uniqueUsersPaid).toBe("number");
    expect(typeof data.traction.payouts).toBe("number");
    expect(typeof data.traction.usdcPaidMicro).toBe("string");
    expect(data.traction.decisions).toEqual({
      PAY: expect.any(Number),
      HOLD: expect.any(Number),
      ESCALATE: expect.any(Number),
      REJECT: expect.any(Number),
    });
    expect(data.traction.escalations).toEqual({
      total: expect.any(Number),
      approved: expect.any(Number),
      rejected: expect.any(Number),
      humanAgreedWithAgent: expect.any(Number),
    });
    expect(typeof data.traction.onTimeRate).toBe("number");
  });
});
