import { keccak256, stringToBytes, type Hex } from "viem";

/**
 * Normalizes any value for canonical JSON encoding:
 * - BigInt converted to decimal string
 * - Object keys sorted alphabetically
 * - Arrays preserved with normalized items
 * - Primitives unchanged
 * - Dates converted to ISO string
 */
export function normalizeForCanonicalJson(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeForCanonicalJson);
  }

  if (typeof value === "object") {
    const sortedObj: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) {
        sortedObj[key] = normalizeForCanonicalJson(v);
      }
    }
    return sortedObj;
  }

  return value;
}

/**
 * Produces deterministic canonical JSON:
 * - Recursively sorted keys
 * - No extra whitespace
 * - BigInts as decimal strings
 */
export function canonicalJson(obj: unknown): string {
  const normalized = normalizeForCanonicalJson(obj);
  return JSON.stringify(normalized);
}

/**
 * Computes keccak256 hash of canonical JSON data, returned as a 0x-prefixed hex string (32 bytes).
 */
export function hashReason(data: unknown): Hex {
  const jsonStr = canonicalJson(data);
  return keccak256(stringToBytes(jsonStr));
}

/**
 * Computes decisionKey = keccak256(toBytes(decisionId)).
 */
export function computeDecisionKey(decisionId: string): Hex {
  return keccak256(stringToBytes(decisionId));
}
