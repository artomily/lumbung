import { describe, it, expect } from "vitest";
import { evaluateRules } from "./rules";
import type { DecisionSnapshot } from "./types";
import { getAddress } from "viem";

const VALID_WALLET = getAddress("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function makeMockSnapshot(overrides?: Partial<DecisionSnapshot>): DecisionSnapshot {
  const base: DecisionSnapshot = {
    asOf: "2026-10-16T10:00:00.000Z",
    network: "arc-testnet",
    vault: {
      balanceMicro: 100_000_000n, // 100 USDC
      remainingToday: {
        REWARD: 50_000_000n, // 50 USDC
        CREATOR: 100_000_000n,
        OPS: 20_000_000n,
      },
      perTxCap: {
        REWARD: 5_000_000n, // 5 USDC
        CREATOR: 25_000_000n,
        OPS: 10_000_000n,
      },
      paused: false,
    },
    liability: {
      pointsOutstanding: 10_000n,
      microUsdcPerPoint: 500n,
      liabilityMicro: 5_000_000n, // 5 USDC
      snapshotAgeSec: 120, // 2 minutes
    },
    solvency: {
      reserveRatio: 20.0, // 100 / 5 = 20.0 (healthy)
      avgDailyPayout7dMicro: 10_000_000n,
      runwayDays: 10,
      pendingEscalationsMicro: 0n,
    },
    request: {
      redeemId: "owr_test_001",
      userId: "u_100",
      wallet: VALID_WALLET,
      points: 500n,
      amountMicro: 250_000n, // 500 * 500 = 250_000 (0.25 USDC)
      source: "owatch",
    },
    user: {
      accountAgeDays: 30,
      redeems24h: 0,
      redeems7d: 2,
      paidTotalMicro: 500_000n,
      medianRedeemMicro: 250_000n,
      pointsEarned7d: 1200n,
      walletSharedWithOtherUsers: 0,
    },
  };

  if (!overrides) return base;

  return {
    ...base,
    ...overrides,
    vault: { ...base.vault, ...overrides.vault },
    liability: { ...base.liability, ...overrides.liability },
    solvency: { ...base.solvency, ...overrides.solvency },
    request: { ...base.request, ...overrides.request },
    user: { ...base.user, ...overrides.user },
  };
}

describe("Hard Rules R1 to R12", () => {
  describe("R1_valid_wallet", () => {
    it("passes for valid checksummed non-zero address", () => {
      const snap = makeMockSnapshot();
      const res = evaluateRules(snap);
      const r1 = res.ruleResults.find((r) => r.id === "R1_valid_wallet");
      expect(r1?.passed).toBe(true);
      expect(res.forced).toBeUndefined();
    });

    it("fails and forces REJECT for zero address", () => {
      const snap = makeMockSnapshot({
        request: {
          ...makeMockSnapshot().request,
          wallet: ZERO_ADDRESS,
        },
      });
      const res = evaluateRules(snap);
      const r1 = res.ruleResults.find((r) => r.id === "R1_valid_wallet");
      expect(r1?.passed).toBe(false);
      expect(res.forced).toBe("REJECT");
      expect(res.allowedActions).toEqual(["REJECT"]);
    });

    it("fails and forces REJECT for unchecksummed lowercase address", () => {
      const snap = makeMockSnapshot({
        request: {
          ...makeMockSnapshot().request,
          wallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as `0x${string}`,
        },
      });
      const res = evaluateRules(snap);
      const r1 = res.ruleResults.find((r) => r.id === "R1_valid_wallet");
      expect(r1?.passed).toBe(false);
      expect(res.forced).toBe("REJECT");
      expect(res.allowedActions).toEqual(["REJECT"]);
    });

    it("fails and forces REJECT for invalid string", () => {
      const snap = makeMockSnapshot({
        request: {
          ...makeMockSnapshot().request,
          wallet: "not-an-address" as `0x${string}`,
        },
      });
      const res = evaluateRules(snap);
      expect(res.forced).toBe("REJECT");
    });
  });

  describe("R2_amount_matches_points", () => {
    it("passes when amountMicro equals points * microUsdcPerPoint", () => {
      const snap = makeMockSnapshot({
        request: {
          ...makeMockSnapshot().request,
          points: 1000n,
          amountMicro: 500_000n, // 1000 * 500
        },
      });
      const res = evaluateRules(snap);
      const r2 = res.ruleResults.find((r) => r.id === "R2_amount_matches_points");
      expect(r2?.passed).toBe(true);
      expect(res.forced).toBeUndefined();
    });

    it("fails and forces REJECT when amountMicro does not match points * rate", () => {
      const snap = makeMockSnapshot({
        request: {
          ...makeMockSnapshot().request,
          points: 1000n,
          amountMicro: 600_000n, // should be 500_000
        },
      });
      const res = evaluateRules(snap);
      const r2 = res.ruleResults.find((r) => r.id === "R2_amount_matches_points");
      expect(r2?.passed).toBe(false);
      expect(res.forced).toBe("REJECT");
      expect(res.allowedActions).toEqual(["REJECT"]);
    });
  });

  describe("R3_vault_paused", () => {
    it("passes when vault is not paused", () => {
      const snap = makeMockSnapshot({ vault: { ...makeMockSnapshot().vault, paused: false } });
      const res = evaluateRules(snap);
      const r3 = res.ruleResults.find((r) => r.id === "R3_vault_paused");
      expect(r3?.passed).toBe(true);
      expect(res.allowedActions).toContain("PAY");
    });

    it("fails and forces HOLD when vault is paused", () => {
      const snap = makeMockSnapshot({ vault: { ...makeMockSnapshot().vault, paused: true } });
      const res = evaluateRules(snap);
      const r3 = res.ruleResults.find((r) => r.id === "R3_vault_paused");
      expect(r3?.passed).toBe(false);
      expect(res.forced).toBe("HOLD");
      expect(res.allowedActions).toEqual(["HOLD"]);
    });
  });

  describe("R4_liability_fresh", () => {
    it("passes when liability snapshot age <= 3600 seconds", () => {
      const snap = makeMockSnapshot({ liability: { ...makeMockSnapshot().liability, snapshotAgeSec: 3600 } });
      const res = evaluateRules(snap);
      const r4 = res.ruleResults.find((r) => r.id === "R4_liability_fresh");
      expect(r4?.passed).toBe(true);
      expect(res.allowedActions).toContain("PAY");
    });

    it("fails and removes PAY when liability snapshot is stale (> 3600s)", () => {
      const snap = makeMockSnapshot({ liability: { ...makeMockSnapshot().liability, snapshotAgeSec: 3601 } });
      const res = evaluateRules(snap);
      const r4 = res.ruleResults.find((r) => r.id === "R4_liability_fresh");
      expect(r4?.passed).toBe(false);
      expect(res.allowedActions).not.toContain("PAY");
      expect(res.allowedActions).toEqual(["HOLD", "ESCALATE"]);
    });
  });

  describe("R5_within_per_tx", () => {
    it("passes when amountMicro <= perTxCap.REWARD", () => {
      const snap = makeMockSnapshot({
        request: { ...makeMockSnapshot().request, points: 10_000n, amountMicro: 5_000_000n }, // 5 USDC
        vault: {
          ...makeMockSnapshot().vault,
          perTxCap: { REWARD: 5_000_000n, CREATOR: 25_000_000n, OPS: 10_000_000n },
        },
      });
      const res = evaluateRules(snap);
      const r5 = res.ruleResults.find((r) => r.id === "R5_within_per_tx");
      expect(r5?.passed).toBe(true);
      expect(res.allowedActions).toContain("PAY");
    });

    it("fails and removes PAY while keeping ESCALATE when amountMicro > perTxCap.REWARD", () => {
      const snap = makeMockSnapshot({
        request: { ...makeMockSnapshot().request, points: 12_000n, amountMicro: 6_000_000n }, // 6 USDC
        vault: {
          ...makeMockSnapshot().vault,
          perTxCap: { REWARD: 5_000_000n, CREATOR: 25_000_000n, OPS: 10_000_000n },
          remainingToday: { REWARD: 50_000_000n, CREATOR: 100_000_000n, OPS: 20_000_000n },
        },
      });
      const res = evaluateRules(snap);
      const r5 = res.ruleResults.find((r) => r.id === "R5_within_per_tx");
      expect(r5?.passed).toBe(false);
      expect(res.allowedActions).not.toContain("PAY");
      expect(res.allowedActions).toContain("ESCALATE");
    });
  });

  describe("R6_within_daily", () => {
    it("passes when amountMicro <= remainingToday.REWARD", () => {
      const snap = makeMockSnapshot({
        request: { ...makeMockSnapshot().request, points: 2000n, amountMicro: 1_000_000n },
        vault: {
          ...makeMockSnapshot().vault,
          remainingToday: { REWARD: 1_000_000n, CREATOR: 100_000_000n, OPS: 20_000_000n },
        },
      });
      const res = evaluateRules(snap);
      const r6 = res.ruleResults.find((r) => r.id === "R6_within_daily");
      expect(r6?.passed).toBe(true);
      expect(res.allowedActions).toContain("PAY");
    });

    it("fails and removes PAY when amountMicro > remainingToday.REWARD", () => {
      const snap = makeMockSnapshot({
        request: { ...makeMockSnapshot().request, points: 2000n, amountMicro: 1_000_000n },
        vault: {
          ...makeMockSnapshot().vault,
          remainingToday: { REWARD: 500_000n, CREATOR: 100_000_000n, OPS: 20_000_000n },
        },
      });
      const res = evaluateRules(snap);
      const r6 = res.ruleResults.find((r) => r.id === "R6_within_daily");
      expect(r6?.passed).toBe(false);
      expect(res.allowedActions).not.toContain("PAY");
      expect(res.allowedActions).toContain("HOLD");
      expect(res.allowedActions).toContain("ESCALATE");
    });
  });

  describe("R7_balance", () => {
    it("passes when amountMicro <= balanceMicro - pendingEscalationsMicro", () => {
      const snap = makeMockSnapshot({
        vault: { ...makeMockSnapshot().vault, balanceMicro: 10_000_000n },
        solvency: { ...makeMockSnapshot().solvency, pendingEscalationsMicro: 2_000_000n },
        request: { ...makeMockSnapshot().request, points: 16_000n, amountMicro: 8_000_000n },
      });
      const res = evaluateRules(snap);
      const r7 = res.ruleResults.find((r) => r.id === "R7_balance");
      expect(r7?.passed).toBe(true);
    });

    it("fails and forces HOLD when vault available balance is insufficient", () => {
      const snap = makeMockSnapshot({
        vault: { ...makeMockSnapshot().vault, balanceMicro: 10_000_000n },
        solvency: { ...makeMockSnapshot().solvency, pendingEscalationsMicro: 8_000_000n },
        request: { ...makeMockSnapshot().request, points: 6000n, amountMicro: 3_000_000n }, // 3M > 10M - 8M (2M)
      });
      const res = evaluateRules(snap);
      const r7 = res.ruleResults.find((r) => r.id === "R7_balance");
      expect(r7?.passed).toBe(false);
      expect(res.forced).toBe("HOLD");
      expect(res.allowedActions).toEqual(["HOLD"]);
    });
  });

  describe("R8_solvency_critical", () => {
    it("passes when reserveRatio >= 0.5", () => {
      const snap = makeMockSnapshot({ solvency: { ...makeMockSnapshot().solvency, reserveRatio: 0.5 } });
      const res = evaluateRules(snap);
      const r8 = res.ruleResults.find((r) => r.id === "R8_solvency_critical");
      expect(r8?.passed).toBe(true);
    });

    it("fails and removes PAY when reserveRatio < 0.5", () => {
      const snap = makeMockSnapshot({ solvency: { ...makeMockSnapshot().solvency, reserveRatio: 0.49 } });
      const res = evaluateRules(snap);
      const r8 = res.ruleResults.find((r) => r.id === "R8_solvency_critical");
      expect(r8?.passed).toBe(false);
      expect(res.allowedActions).not.toContain("PAY");
      expect(res.allowedActions).toEqual(["HOLD", "ESCALATE"]);
    });
  });

  describe("R9_solvency_low", () => {
    it("passes and allows PAY when 0.5 <= reserveRatio < 1.0 and amountMicro <= 1 USDC", () => {
      const snap = makeMockSnapshot({
        solvency: { ...makeMockSnapshot().solvency, reserveRatio: 0.8 },
        request: { ...makeMockSnapshot().request, points: 2000n, amountMicro: 1_000_000n }, // 1 USDC
      });
      const res = evaluateRules(snap);
      const r9 = res.ruleResults.find((r) => r.id === "R9_solvency_low");
      expect(r9?.passed).toBe(true);
      expect(res.allowedActions).toContain("PAY");
    });

    it("fails and removes PAY when 0.5 <= reserveRatio < 1.0 and amountMicro > 1 USDC", () => {
      const snap = makeMockSnapshot({
        solvency: { ...makeMockSnapshot().solvency, reserveRatio: 0.8 },
        request: { ...makeMockSnapshot().request, points: 3000n, amountMicro: 1_500_000n }, // 1.5 USDC
      });
      const res = evaluateRules(snap);
      const r9 = res.ruleResults.find((r) => r.id === "R9_solvency_low");
      expect(r9?.passed).toBe(false);
      expect(res.allowedActions).not.toContain("PAY");
    });

    it("passes when reserveRatio >= 1.0 regardless of amountMicro within caps", () => {
      const snap = makeMockSnapshot({
        solvency: { ...makeMockSnapshot().solvency, reserveRatio: 1.5 },
        request: { ...makeMockSnapshot().request, points: 4000n, amountMicro: 2_000_000n }, // 2 USDC
      });
      const res = evaluateRules(snap);
      const r9 = res.ruleResults.find((r) => r.id === "R9_solvency_low");
      expect(r9?.passed).toBe(true);
      expect(res.allowedActions).toContain("PAY");
    });
  });

  describe("R10_velocity", () => {
    it("passes when redeems24h < 3", () => {
      const snap = makeMockSnapshot({ user: { ...makeMockSnapshot().user, redeems24h: 2 } });
      const res = evaluateRules(snap);
      const r10 = res.ruleResults.find((r) => r.id === "R10_velocity");
      expect(r10?.passed).toBe(true);
      expect(res.allowedActions).toContain("PAY");
    });

    it("fails and removes PAY when redeems24h >= 3", () => {
      const snap = makeMockSnapshot({ user: { ...makeMockSnapshot().user, redeems24h: 3 } });
      const res = evaluateRules(snap);
      const r10 = res.ruleResults.find((r) => r.id === "R10_velocity");
      expect(r10?.passed).toBe(false);
      expect(res.allowedActions).not.toContain("PAY");
      expect(res.allowedActions).toContain("HOLD");
      expect(res.allowedActions).toContain("ESCALATE");
    });
  });

  describe("R11_new_account_big", () => {
    it("passes when account is new (< 1 day) but amountMicro <= 1 USDC", () => {
      const snap = makeMockSnapshot({
        user: { ...makeMockSnapshot().user, accountAgeDays: 0.5 },
        request: { ...makeMockSnapshot().request, points: 2000n, amountMicro: 1_000_000n },
      });
      const res = evaluateRules(snap);
      const r11 = res.ruleResults.find((r) => r.id === "R11_new_account_big");
      expect(r11?.passed).toBe(true);
      expect(res.allowedActions).toContain("PAY");
    });

    it("fails and removes PAY when account is new (< 1 day) and amountMicro > 1 USDC", () => {
      const snap = makeMockSnapshot({
        user: { ...makeMockSnapshot().user, accountAgeDays: 0.5 },
        request: { ...makeMockSnapshot().request, points: 2500n, amountMicro: 1_250_000n },
      });
      const res = evaluateRules(snap);
      const r11 = res.ruleResults.find((r) => r.id === "R11_new_account_big");
      expect(r11?.passed).toBe(false);
      expect(res.allowedActions).not.toContain("PAY");
    });

    it("passes when account is established (>= 1 day) even if amountMicro > 1 USDC", () => {
      const snap = makeMockSnapshot({
        user: { ...makeMockSnapshot().user, accountAgeDays: 5 },
        request: { ...makeMockSnapshot().request, points: 4000n, amountMicro: 2_000_000n },
      });
      const res = evaluateRules(snap);
      const r11 = res.ruleResults.find((r) => r.id === "R11_new_account_big");
      expect(r11?.passed).toBe(true);
      expect(res.allowedActions).toContain("PAY");
    });

    it("passes when account age is null (unknown)", () => {
      const snap = makeMockSnapshot({
        user: { ...makeMockSnapshot().user, accountAgeDays: null },
        request: { ...makeMockSnapshot().request, points: 4000n, amountMicro: 2_000_000n },
      });
      const res = evaluateRules(snap);
      const r11 = res.ruleResults.find((r) => r.id === "R11_new_account_big");
      expect(r11?.passed).toBe(true);
      expect(res.allowedActions).toContain("PAY");
    });
  });

  describe("R12_shared_wallet", () => {
    it("passes when walletSharedWithOtherUsers < 2", () => {
      const snap = makeMockSnapshot({
        user: { ...makeMockSnapshot().user, walletSharedWithOtherUsers: 1 },
      });
      const res = evaluateRules(snap);
      const r12 = res.ruleResults.find((r) => r.id === "R12_shared_wallet");
      expect(r12?.passed).toBe(true);
      expect(res.allowedActions).toContain("PAY");
    });

    it("fails and removes PAY when walletSharedWithOtherUsers >= 2", () => {
      const snap = makeMockSnapshot({
        user: { ...makeMockSnapshot().user, walletSharedWithOtherUsers: 2 },
      });
      const res = evaluateRules(snap);
      const r12 = res.ruleResults.find((r) => r.id === "R12_shared_wallet");
      expect(r12?.passed).toBe(false);
      expect(res.allowedActions).not.toContain("PAY");
    });
  });
});

describe("Four Demo Scenarios (04-AGENT.md)", () => {
  it("Scenario 1: Normal viewer, healthy reserve -> PAY in seconds", () => {
    const snap = makeMockSnapshot({
      solvency: {
        reserveRatio: 2.5,
        avgDailyPayout7dMicro: 10_000_000n,
        runwayDays: 25,
        pendingEscalationsMicro: 0n,
      },
      request: {
        redeemId: "owr_demo_01",
        userId: "u_normal_viewer",
        wallet: VALID_WALLET,
        points: 500n,
        amountMicro: 250_000n, // 0.25 USDC
        source: "owatch",
      },
      user: {
        accountAgeDays: 45,
        redeems24h: 0,
        redeems7d: 1,
        paidTotalMicro: 250_000n,
        medianRedeemMicro: 250_000n,
        pointsEarned7d: 1000n,
        walletSharedWithOtherUsers: 0,
      },
    });

    const res = evaluateRules(snap);
    expect(res.forced).toBeUndefined();
    expect(res.allowedActions).toContain("PAY");
    expect(res.ruleResults.every((r) => r.passed)).toBe(true);
  });

  it("Scenario 2: Same viewer redeems 3x in an hour -> HOLD/ESCALATE with velocity reasoning", () => {
    const snap = makeMockSnapshot({
      solvency: {
        reserveRatio: 2.5,
        avgDailyPayout7dMicro: 10_000_000n,
        runwayDays: 25,
        pendingEscalationsMicro: 0n,
      },
      request: {
        redeemId: "owr_demo_02",
        userId: "u_velocity_viewer",
        wallet: VALID_WALLET,
        points: 500n,
        amountMicro: 250_000n,
        source: "owatch",
      },
      user: {
        accountAgeDays: 45,
        redeems24h: 3, // Velocity threshold triggered
        redeems7d: 5,
        paidTotalMicro: 750_000n,
        medianRedeemMicro: 250_000n,
        pointsEarned7d: 2000n,
        walletSharedWithOtherUsers: 0,
      },
    });

    const res = evaluateRules(snap);
    const r10 = res.ruleResults.find((r) => r.id === "R10_velocity");
    expect(r10?.passed).toBe(false);
    expect(res.allowedActions).not.toContain("PAY");
    expect(res.allowedActions).toEqual(["HOLD", "ESCALATE"]);
  });

  it("Scenario 3: Amount above per-tx cap -> ESCALATE -> owner approves on-chain -> paid", () => {
    // Reward per-tx cap is 5 USDC (5_000_000n). Request is 10 USDC (10_000_000n).
    const snap = makeMockSnapshot({
      vault: {
        balanceMicro: 100_000_000n,
        remainingToday: { REWARD: 50_000_000n, CREATOR: 100_000_000n, OPS: 20_000_000n },
        perTxCap: { REWARD: 5_000_000n, CREATOR: 25_000_000n, OPS: 10_000_000n },
        paused: false,
      },
      request: {
        redeemId: "owr_demo_03",
        userId: "u_high_redeem",
        wallet: VALID_WALLET,
        points: 20_000n,
        amountMicro: 10_000_000n, // 10 USDC > 5 USDC perTxCap
        source: "owatch",
      },
      user: {
        accountAgeDays: 90,
        redeems24h: 0,
        redeems7d: 2,
        paidTotalMicro: 2_000_000n,
        medianRedeemMicro: 1_000_000n,
        pointsEarned7d: 25_000n,
        walletSharedWithOtherUsers: 0,
      },
    });

    const res = evaluateRules(snap);
    const r5 = res.ruleResults.find((r) => r.id === "R5_within_per_tx");
    expect(r5?.passed).toBe(false);
    expect(res.allowedActions).not.toContain("PAY");
    expect(res.allowedActions).toContain("ESCALATE");
  });

  describe("Scenario 4: Solvency drop (reserveRatio < 1.0)", () => {
    it("Scenario 4a: Small redeem (<= 1 USDC) pays despite low reserve ratio (0.8)", () => {
      const snap = makeMockSnapshot({
        solvency: {
          reserveRatio: 0.8, // Low reserve band [0.5, 1.0)
          avgDailyPayout7dMicro: 10_000_000n,
          runwayDays: 3,
          pendingEscalationsMicro: 0n,
        },
        request: {
          redeemId: "owr_demo_04_small",
          userId: "u_small_redeemer",
          wallet: VALID_WALLET,
          points: 1000n,
          amountMicro: 500_000n, // 0.5 USDC <= 1 USDC limit
          source: "owatch",
        },
      });

      const res = evaluateRules(snap);
      const r9 = res.ruleResults.find((r) => r.id === "R9_solvency_low");
      expect(r9?.passed).toBe(true);
      expect(res.allowedActions).toContain("PAY");
    });

    it("Scenario 4b: Larger redeem (> 1 USDC) holds when reserve ratio is low (0.8)", () => {
      const snap = makeMockSnapshot({
        solvency: {
          reserveRatio: 0.8, // Low reserve band [0.5, 1.0)
          avgDailyPayout7dMicro: 10_000_000n,
          runwayDays: 3,
          pendingEscalationsMicro: 0n,
        },
        request: {
          redeemId: "owr_demo_04_large",
          userId: "u_large_redeemer",
          wallet: VALID_WALLET,
          points: 4000n,
          amountMicro: 2_000_000n, // 2 USDC > 1 USDC limit
          source: "owatch",
        },
      });

      const res = evaluateRules(snap);
      const r9 = res.ruleResults.find((r) => r.id === "R9_solvency_low");
      expect(r9?.passed).toBe(false);
      expect(res.allowedActions).not.toContain("PAY");
      expect(res.allowedActions).toContain("HOLD");
      expect(res.allowedActions).toContain("ESCALATE");
    });
  });
});
