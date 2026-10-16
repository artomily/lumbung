/**
 * Micro-USDC money utilities.
 * 
 * Rules:
 * - 6 decimals: 1 USDC = 1_000_000 micro-USDC.
 * - Always use bigint for internal money representation. Never use floats.
 * - String inputs for external APIs/JSON.
 */

export const MICRO_USDC_DECIMALS = 6;
export const MICRO_USDC_ONE = 1_000_000n;

/**
 * Converts a decimal USDC string or number to micro-USDC bigint safely without float imprecision.
 * Example: "1.5" -> 1_500_000n, "0.000001" -> 1n, 5 -> 5_000_000n.
 */
export function usdcToMicro(usdc: string | number): bigint {
  const str = typeof usdc === "number" ? usdc.toString() : usdc.trim();
  if (!str) {
    throw new Error("Invalid USDC string: empty");
  }

  const parts = str.split(".");
  if (parts.length > 2) {
    throw new Error(`Invalid USDC string: ${str}`);
  }

  const integerPart = parts[0] || "0";
  const fractionalPart = (parts[1] || "").slice(0, MICRO_USDC_DECIMALS).padEnd(MICRO_USDC_DECIMALS, "0");

  const sign = integerPart.startsWith("-") ? -1n : 1n;
  const cleanInt = integerPart.replace("-", "");

  if (!/^\d+$/.test(cleanInt) || !/^\d+$/.test(fractionalPart)) {
    throw new Error(`Invalid numeric characters in USDC string: ${str}`);
  }

  const combined = BigInt(cleanInt) * MICRO_USDC_ONE + BigInt(fractionalPart);
  return sign * combined;
}

/**
 * Parse an integer string of micro-USDC to bigint.
 * Example: "250000" -> 250000n.
 */
export function parseMicro(val: string | number | bigint): bigint {
  if (typeof val === "bigint") return val;
  if (typeof val === "number") {
    if (!Number.isInteger(val)) {
      throw new Error(`parseMicro requires an integer: got float ${val}`);
    }
    return BigInt(val);
  }
  const clean = val.trim();
  if (!/^-?\d+$/.test(clean)) {
    throw new Error(`Invalid micro-USDC integer string: "${val}"`);
  }
  return BigInt(clean);
}

/**
 * Converts micro-USDC bigint to decimal string representation.
 * Example: 1_250_000n -> "1.25", 500_000n -> "0.5", 1n -> "0.000001".
 */
export function microToUsdcString(micro: bigint, trimTrailingZeros = true): string {
  const sign = micro < 0n ? "-" : "";
  const abs = micro < 0n ? -micro : micro;

  const intPart = abs / MICRO_USDC_ONE;
  const fracPart = (abs % MICRO_USDC_ONE).toString().padStart(MICRO_USDC_DECIMALS, "0");

  if (trimTrailingZeros) {
    const trimmedFrac = fracPart.replace(/0+$/, "");
    return trimmedFrac.length > 0 ? `${sign}${intPart}.${trimmedFrac}` : `${sign}${intPart}`;
  }

  return `${sign}${intPart}.${fracPart}`;
}

/**
 * Format micro-USDC for UI display with currency symbol.
 * Example: 1_250_000n -> "$1.25", 250_000n -> "$0.25".
 */
export function formatMicro(micro: bigint, fractionDigits = 2): string {
  const sign = micro < 0n ? "-" : "";
  const abs = micro < 0n ? -micro : micro;

  const intPart = abs / MICRO_USDC_ONE;
  const fracPart = (abs % MICRO_USDC_ONE).toString().padStart(MICRO_USDC_DECIMALS, "0");

  const formattedInt = intPart.toLocaleString("en-US");
  const formattedFrac = fracPart.slice(0, fractionDigits).padEnd(fractionDigits, "0");

  return `${sign}$${formattedInt}.${formattedFrac}`;
}

/**
 * Format micro-USDC for display with USDC label.
 * Example: 1_250_000n -> "1.25 USDC".
 */
export function formatMicroUsdc(micro: bigint): string {
  return `${microToUsdcString(micro)} USDC`;
}
