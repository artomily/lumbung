import { describe, it, expect } from "vitest";
import { canonicalJson, hashReason, computeDecisionKey } from "./canonical";

describe("canonical helpers", () => {
  it("sorts object keys alphabetically and converts bigints to strings", () => {
    const raw = {
      z: 100n,
      a: "hello",
      m: {
        y: 200n,
        b: true,
      },
      arr: [1, 2, 3n],
    };

    const json = canonicalJson(raw);
    expect(json).toBe('{"a":"hello","arr":[1,2,"3"],"m":{"b":true,"y":"200"},"z":"100"}');
  });

  it("produces deterministic hashReason", () => {
    const data1 = { b: 2n, a: "test" };
    const data2 = { a: "test", b: 2n };

    const hash1 = hashReason(data1);
    const hash2 = hashReason(data2);

    expect(hash1).toBe(hash2);
    expect(hash1.startsWith("0x")).toBe(true);
    expect(hash1.length).toBe(66); // 32 bytes hex + '0x'
  });

  it("computes decisionKey from decision UUID", () => {
    const key = computeDecisionKey("550e8400-e29b-41d4-a716-446655440000");
    expect(key.startsWith("0x")).toBe(true);
    expect(key.length).toBe(66);
  });
});
