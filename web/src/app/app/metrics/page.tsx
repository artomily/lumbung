import React from "react";
import Link from "next/link";
import { formatMicro, parseMicro } from "@/lib/money";
import { getPublicStats, getDailyPayoutStats } from "@/lib/queries";
import { PayoutsChart } from "@/components/PayoutsChart";
import { ConfigNotice } from "@/components/ConfigNotice";
import { RoyalSeal } from "@/components/ornaments/RoyalSeal";
import { CornerFlourish } from "@/components/ornaments/CornerFlourish";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const [stats, dailyPayouts] = await Promise.all([
    getPublicStats(),
    getDailyPayoutStats(14),
  ]);

  const totalDecisions =
    stats.traction.decisions.PAY +
    stats.traction.decisions.HOLD +
    stats.traction.decisions.ESCALATE +
    stats.traction.decisions.REJECT;

  const totalEscalations = stats.traction.escalations.total;
  const agreementRate =
    totalEscalations > 0
      ? (
          (stats.traction.escalations.humanAgreedWithAgent / totalEscalations) *
          100
        ).toFixed(1)
      : "100.0";

  const onTimePercent = (stats.traction.onTimeRate * 100).toFixed(1);

  return (
    <div className="page-container w-full px-4 sm:px-6 lg:px-10 xl:px-14 space-y-8">
      {/* Back Link to Treasury */}
      <div className="-mb-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 font-cinzel text-xs font-semibold text-[#8c6b24] hover:text-[#b08d3c] transition-colors"
        >
          <span>←</span>
          <span>Back to Royal Granary</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="parchment-card parchment-card-inner relative overflow-hidden p-6 sm:p-8">
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <CornerFlourish position="tl" size={20} />
        </div>
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <CornerFlourish position="tr" size={20} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-start gap-4">
            <RoyalSeal size={42} variant="sage" />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-serif text-xl font-bold text-[#4c5d34]">IV.</span>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-[#1a1f12]">
                  Treasury Records & Telemetry
                </h1>
                <span className="rounded-sm border border-[#4c5d34]/40 bg-[#edf5e5] px-2.5 py-0.5 font-cinzel text-[10px] font-bold uppercase tracking-wider text-[#2f3a20]">
                  Protocol Analytics
                </span>
              </div>
              <p className="mt-1.5 font-serif text-xs sm:text-sm text-[#3c4132] italic max-w-3xl leading-relaxed">
                Platform traction metrics, daily disbursement volume, autonomous agent accuracy, and human-in-the-loop agreement rates. Strictly authentic telemetry (simulations excluded).
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConfigNotice
        isDbConfigured={stats.configured}
        isVaultConfigured={true}
      />

      {/* Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="parchment-card parchment-card-inner p-5 space-y-1">
          <span className="font-cinzel text-[10px] uppercase text-[#6b6e5d] tracking-wider block">
            Completed Payouts
          </span>
          <span className="font-mono text-2xl font-bold text-[#1a1f12] block">
            {stats.traction.payouts}
          </span>
          <span className="font-serif text-xs text-[#4c5d34] italic block">
            Autonomous disbursements
          </span>
        </div>

        <div className="parchment-card parchment-card-inner p-5 space-y-1">
          <span className="font-cinzel text-[10px] uppercase text-[#6b6e5d] tracking-wider block">
            Capital Disbursed
          </span>
          <span className="font-mono text-2xl font-bold text-[#1a1f12] block">
            {formatMicro(parseMicro(stats.traction.usdcPaidMicro))}
          </span>
          <span className="font-serif text-xs text-[#8c6b24] italic block">
            USDC settled on Arc
          </span>
        </div>

        <div className="parchment-card parchment-card-inner p-5 space-y-1">
          <span className="font-cinzel text-[10px] uppercase text-[#6b6e5d] tracking-wider block">
            Unique Viewers Paid
          </span>
          <span className="font-mono text-2xl font-bold text-[#1a1f12] block">
            {stats.traction.uniqueUsersPaid}
          </span>
          <span className="font-serif text-xs text-[#6b6e5d] italic block">
            Distinct wallet addresses
          </span>
        </div>

        <div className="parchment-card parchment-card-inner p-5 space-y-1">
          <span className="font-cinzel text-[10px] uppercase text-[#6b6e5d] tracking-wider block">
            Sub-Minute Payout Rate
          </span>
          <span className="font-mono text-2xl font-bold text-[#4c5d34] block">
            {onTimePercent}%
          </span>
          <span className="font-serif text-xs text-[#4c5d34] italic block">
            Settled under 60 seconds
          </span>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="parchment-card parchment-card-inner p-5 space-y-2">
          <span className="font-cinzel text-[10px] uppercase text-[#6b6e5d] tracking-wider block">
            Human-Agent Agreement
          </span>
          <span className="font-mono text-2xl font-bold text-[#1a1f12] block">
            {agreementRate}%
          </span>
          <p className="font-serif text-xs text-[#3c4132] leading-relaxed">
            Rate at which the human owner verified and ratified the AI keeper&apos;s recommendations across {totalEscalations} escalations.
          </p>
        </div>

        <div className="parchment-card parchment-card-inner p-5 space-y-2">
          <span className="font-cinzel text-[10px] uppercase text-[#6b6e5d] tracking-wider block">
            Average Payout Size
          </span>
          <span className="font-mono text-2xl font-bold text-[#1a1f12] block">
            {stats.traction.payouts > 0
              ? formatMicro(
                  parseMicro(stats.traction.usdcPaidMicro) /
                    BigInt(stats.traction.payouts)
                )
              : "$0.00"}
          </span>
          <p className="font-serif text-xs text-[#3c4132] leading-relaxed">
            Typical micro-disbursement honoring viewer video watch attention tokens on OWatch.
          </p>
        </div>

        <div className="parchment-card parchment-card-inner p-5 space-y-2">
          <span className="font-cinzel text-[10px] uppercase text-[#6b6e5d] tracking-wider block">
            Total AI Evaluations
          </span>
          <span className="font-mono text-2xl font-bold text-[#1a1f12] block">
            {totalDecisions}
          </span>
          <p className="font-serif text-xs text-[#3c4132] leading-relaxed">
            Full count of decisions processed across all categories (PAY, HOLD, ESCALATE, REJECT).
          </p>
        </div>
      </div>

      {/* Payouts Distribution Chart */}
      <div className="parchment-card parchment-card-inner p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#d6d6c8] pb-3">
          <div>
            <h3 className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#1a1f12]">
              14-Day Payout Distribution
            </h3>
            <p className="font-serif text-xs text-[#6b6e5d] italic">
              Daily volume of settled reward redemptions and creator disbursements
            </p>
          </div>
          <span className="font-cinzel text-[10px] uppercase text-[#8c6b24]">
            Last 14 Days
          </span>
        </div>

        <PayoutsChart data={dailyPayouts} />
      </div>

      {/* Decision Breakdown Breakdown Table */}
      <div className="parchment-card parchment-card-inner p-6 space-y-4">
        <h3 className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#1a1f12] border-b border-[#d6d6c8] pb-2">
          AI Keeper Action Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="rounded-md border border-[#4c5d34]/30 bg-[#edf5e5]/50 p-3">
            <span className="font-cinzel text-[10px] uppercase text-[#2f3a20] block">
              PAY (Immediate)
            </span>
            <span className="font-bold text-lg text-[#2f3a20]">
              {stats.traction.decisions.PAY}
            </span>
          </div>

          <div className="rounded-md border border-[#8c6b24]/30 bg-[#f6efe0]/50 p-3">
            <span className="font-cinzel text-[10px] uppercase text-[#785918] block">
              HOLD (Throttle)
            </span>
            <span className="font-bold text-lg text-[#785918]">
              {stats.traction.decisions.HOLD}
            </span>
          </div>

          <div className="rounded-md border border-[#b08d3c]/40 bg-[#fbfaf6] p-3">
            <span className="font-cinzel text-[10px] uppercase text-[#8c6b24] block">
              ESCALATE (Owner)
            </span>
            <span className="font-bold text-lg text-[#8c6b24]">
              {stats.traction.decisions.ESCALATE}
            </span>
          </div>

          <div className="rounded-md border border-[#8c2a24]/30 bg-[#fcf0ee]/50 p-3">
            <span className="font-cinzel text-[10px] uppercase text-[#8c2a24] block">
              REJECT (Blocked)
            </span>
            <span className="font-bold text-lg text-[#8c2a24]">
              {stats.traction.decisions.REJECT}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
