import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns ok status, network, and vaultAddress from env", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.network).toBe("testnet");
    expect(data).toHaveProperty("vaultAddress");
  });
});
