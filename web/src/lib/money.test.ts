import { describe, it, expect } from "vitest";
import {
  usdcToMicro,
  parseMicro,
  microToUsdcString,
  formatMicro,
  formatMicroUsdc,
  MICRO_USDC_ONE,
} from "./money";

describe("money helpers", () => {
  it("usdcToMicro parses integer and decimal strings safely", () => {
    expect(usdcToMicro("1")).toBe(1_000_000n);
    expect(usdcToMicro("1.0")).toBe(1_000_000n);
    expect(usdcToMicro("1.25")).toBe(1_250_000n);
    expect(usdcToMicro("0.5")).toBe(500_000n);
    expect(usdcToMicro("0.000001")).toBe(1n);
    expect(usdcToMicro(5)).toBe(5_000_000n);
  });

  it("parseMicro converts values to bigint", () => {
    expect(parseMicro("250000")).toBe(250_000n);
    expect(parseMicro(1_000_000)).toBe(1_000_000n);
    expect(parseMicro(500_000n)).toBe(500_000n);
  });

  it("microToUsdcString formats micro-USDC to decimal string", () => {
    expect(microToUsdcString(1_250_000n)).toBe("1.25");
    expect(microToUsdcString(500_000n)).toBe("0.5");
    expect(microToUsdcString(1n)).toBe("0.000001");
    expect(microToUsdcString(MICRO_USDC_ONE)).toBe("1");
  });

  it("formatMicro formats as USD currency string", () => {
    expect(formatMicro(1_250_000n)).toBe("$1.25");
    expect(formatMicro(250_000n)).toBe("$0.25");
    expect(formatMicro(50_000_000n)).toBe("$50.00");
  });

  it("formatMicroUsdc formats with USDC suffix", () => {
    expect(formatMicroUsdc(1_250_000n)).toBe("1.25 USDC");
  });
});
