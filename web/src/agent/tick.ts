import { desc, eq, and, gte, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { decisions, decisionEvents, alerts, owatchSnapshots } from "@/lib/db/schema";
import { repollDecision } from "@/agent/execute";
import { decideRedeem } from "@/agent/decide";
import { sendOwnerMessage } from "@/lib/telegram";
import { getVaultSnapshot } from "@/lib/arc";
import { formatMicroUsdc } from "@/lib/money";

export type TickResult = {
  repolled: number;
  reDecided: number;
  alerts: string[];
};

/**
 * Periodic agent tick per 04-AGENT.md Section 6:
 * 1. Re-poll unfinished Circle txs
 * 2. Recompute solvency; alert if reserveRatio < 1 or runwayDays < 3
 * 3. Re-decide HELD items whose holdUntilHint is now satisfied (daily_reset, next_tick)
 * 4. Once per day (first tick after 08:00 WIB): Telegram daily summary
 */
export async function runTick(): Promise<TickResult> {
  const alertMessages: string[] = [];
  let repolled = 0;
  let reDecided = 0;

  // ── 1. Re-poll unfinished Circle txs ─────────────────────────────────────
  const submittedDecisions = await db
    .select({ decisionId: decisionEvents.decisionId })
    .from(decisionEvents)
    .where(or(eq(decisionEvents.status, "SUBMITTED"), eq(decisionEvents.status, "SUBMIT_UNKNOWN")))
    .orderBy(desc(decisionEvents.createdAt));

  // Deduplicate by decisionId (latest event is SUBMITTED)
  const seenIds = new Set<string>();
  for (const row of submittedDecisions) {
    if (seenIds.has(row.decisionId)) continue;
    seenIds.add(row.decisionId);

    try {
      await repollDecision(row.decisionId);
      repolled++;
    } catch (err) {
      console.warn(`[tick] repollDecision ${row.decisionId} failed:`, err);
    }
  }

  // ── 2. Solvency check ─────────────────────────────────────────────────────
  try {
    const vaultSnapshot = await getVaultSnapshot();
    const [latestOwatchSnapshot] = await db
      .select()
      .from(owatchSnapshots)
      .orderBy(desc(owatchSnapshots.asOf))
      .limit(1);

    if (latestOwatchSnapshot) {
      const liabilityMicro =
        latestOwatchSnapshot.pointsOutstanding * latestOwatchSnapshot.microUsdcPerPoint;
      const reserveRatio =
        liabilityMicro > 0n
          ? Number(vaultSnapshot.balanceMicro) / Number(liabilityMicro)
          : 999;

      // Calculate avgDailyPayout7d for runway
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const confirmedPayouts = await db
        .select({ amountMicro: decisions.amountMicro })
        .from(decisions)
        .innerJoin(decisionEvents, eq(decisions.id, decisionEvents.decisionId))
        .where(
          and(
            eq(decisions.action, "PAY"),
            eq(decisionEvents.status, "CONFIRMED"),
            gte(decisionEvents.createdAt, sevenDaysAgo),
          ),
        );

      const totalPayout7d = confirmedPayouts.reduce((acc, row) => acc + row.amountMicro, 0n);
      const avgDailyMicro = confirmedPayouts.length > 0 ? totalPayout7d / 7n : 0n;
      const runwayDays =
        avgDailyMicro > 0n ? Number(vaultSnapshot.balanceMicro) / Number(avgDailyMicro) : null;

      const lowReserve = reserveRatio < 1;
      const shortRunway = runwayDays !== null && runwayDays < 3;

      if (lowReserve || shortRunway) {
        const topUpNeeded =
          liabilityMicro > vaultSnapshot.balanceMicro
            ? liabilityMicro - vaultSnapshot.balanceMicro
            : 0n;
        // Add 20% buffer
        const suggestedTopUp = (topUpNeeded * 12n) / 10n;

        const alertMsg =
          `⚠️ [Lumbung] ${lowReserve ? `Low reserve ratio: ${reserveRatio.toFixed(2)}` : ""}` +
          `${shortRunway ? ` Runway: ${runwayDays?.toFixed(1)} days` : ""}` +
          `\nVault balance: ${formatMicroUsdc(vaultSnapshot.balanceMicro)}` +
          `\nLiability: ${formatMicroUsdc(liabilityMicro)}` +
          `\nSuggested top-up: ${formatMicroUsdc(suggestedTopUp)}`;

        alertMessages.push(alertMsg);

        await sendOwnerMessage(alertMsg);
        await db.insert(alerts).values({
          kind: lowReserve ? "LOW_RESERVE" : "LOW_RUNWAY",
          message: alertMsg,
          data: {
            reserveRatio,
            runwayDays,
            balanceMicro: vaultSnapshot.balanceMicro.toString(),
            liabilityMicro: liabilityMicro.toString(),
            suggestedTopUp: suggestedTopUp.toString(),
          },
          sentTelegram: true,
        });
      }
    }
  } catch (err) {
    console.warn("[tick] Solvency check failed:", err);
    alertMessages.push(`Solvency check failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 3. Re-decide HELD items whose hint is now satisfied ───────────────────
  // Find decisions with action=HOLD and latest event=HELD with hint next_tick or daily_reset
  try {
    const heldDecisions = await db
      .select({
        decisionId: decisions.id,
        subjectId: decisions.subjectId,
        subjectType: decisions.subjectType,
        holdUntilHint: decisions.holdUntilHint,
      })
      .from(decisions)
      .where(eq(decisions.action, "HOLD"))
      .orderBy(desc(decisions.createdAt));

    const now = new Date();
    // WIB = UTC+7; daily reset is midnight WIB = 17:00 UTC previous day
    // Simple approach: if it's a new day (UTC), check daily_reset hints
    const dayStart = new Date(now.toISOString().slice(0, 10) + "T00:00:00Z");

    for (const held of heldDecisions) {
      // Check latest event status for this decision
      const events = await db
        .select()
        .from(decisionEvents)
        .where(eq(decisionEvents.decisionId, held.decisionId))
        .orderBy(decisionEvents.id);
      const latestEvent = events[events.length - 1];

      if (latestEvent?.status !== "HELD") continue;

      const hint = held.holdUntilHint;
      const shouldReDecide =
        hint === "next_tick" ||
        (hint === "daily_reset" && latestEvent.createdAt < dayStart);

      if (!shouldReDecide) continue;

      // Re-decide based on subject type
      if (held.subjectType === "redeem") {
        try {
          await decideRedeem(held.subjectId);
          reDecided++;
        } catch (err) {
          console.warn(`[tick] Re-decide failed for ${held.decisionId}:`, err);
        }
      }
    }
  } catch (err) {
    console.warn("[tick] Re-decide pass failed:", err);
  }

  // ── 4. Daily summary (first tick after 08:00 WIB = 01:00 UTC) ────────────
  try {
    const utcHour = new Date().getUTCHours();
    // Target: 01:00 UTC = 08:00 WIB; check if last daily alert was >20h ago
    if (utcHour === 1) {
      const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);
      const recentDailySummary = await db
        .select({ id: alerts.id })
        .from(alerts)
        .where(and(eq(alerts.kind, "LOW_RESERVE"), gte(alerts.createdAt, twentyHoursAgo)))
        .limit(1);

      // Only send if no recent daily alert (prevent duplicates)
      if (recentDailySummary.length === 0) {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [payCount, escalationCount] = await Promise.all([
          db
            .select({ count: decisions.id })
            .from(decisions)
            .innerJoin(decisionEvents, eq(decisions.id, decisionEvents.decisionId))
            .where(
              and(
                eq(decisions.action, "PAY"),
                eq(decisionEvents.status, "CONFIRMED"),
                gte(decisionEvents.createdAt, dayAgo),
              ),
            ),
          db
            .select({ count: decisions.id })
            .from(decisions)
            .where(and(eq(decisions.action, "ESCALATE"), gte(decisions.createdAt, dayAgo))),
        ]);

        const summary =
          `📊 [Lumbung Daily Summary]\n` +
          `Paid: ${payCount.length} payouts\n` +
          `Escalations: ${escalationCount.length}\n` +
          `Tick completed at: ${new Date().toISOString()}`;

        await sendOwnerMessage(summary);
        alertMessages.push(summary);
      }
    }
  } catch (err) {
    console.warn("[tick] Daily summary failed:", err);
  }

  return { repolled, reDecided, alerts: alertMessages };
}
