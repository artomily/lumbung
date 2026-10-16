import React from "react";
import Link from "next/link";
import { formatMicro, parseMicro } from "@/lib/money";
import { env } from "@/lib/env";
import { getPublicStats, getVaultInfo, getLatestDecisions } from "@/lib/queries";
import { ReserveGauge } from "@/components/ReserveGauge";
import { BudgetEnvelopeCard } from "@/components/BudgetEnvelopeCard";
import { ActionBadge, StatusBadge, CategoryBadge } from "@/components/Badges";
import { ConfigNotice } from "@/components/ConfigNotice";
import { ConcentricRings } from "@/components/ornaments/ConcentricRings";
import { LumbungBarn } from "@/components/ornaments/LumbungBarn";
import { ArcTestnetSeal } from "@/components/ornaments/ArcTestnetSeal";
import { CornerFlourish, DividerFlourish } from "@/components/ornaments/CornerFlourish";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [stats, vaultInfo, latestDecisions] = await Promise.all([
    getPublicStats(),
    getVaultInfo(),
    getLatestDecisions(10),
  ]);

  const explorerUrl = env.NEXT_PUBLIC_ARC_EXPLORER || "https://explorer.testnet.arc.io";

  // Calculate spentInDay from dailyCap and remainingToday
  const rewardDailyCap = 50_000_000n;
  const creatorDailyCap = 100_000_000n;
  const opsDailyCap = 20_000_000n;

  const rewardSpent =
    rewardDailyCap >= vaultInfo.remainingToday.REWARD
      ? rewardDailyCap - vaultInfo.remainingToday.REWARD
      : 0n;

  const creatorSpent =
    creatorDailyCap >= vaultInfo.remainingToday.CREATOR
      ? creatorDailyCap - vaultInfo.remainingToday.CREATOR
      : 0n;

  const opsSpent =
    opsDailyCap >= vaultInfo.remainingToday.OPS
      ? opsDailyCap - vaultInfo.remainingToday.OPS
      : 0n;

  const truncate = (str: string, lead = 6, tail = 4) =>
    str ? `${str.slice(0, lead)}...${str.slice(-tail)}` : "";

  return (
    <div className="page-container w-full px-4 sm:px-6 lg:px-10 xl:px-14 space-y-10">
      {/* ============================================================ */}
      {/* HERO SECTION: The Royal Granary of OWatch                     */}
      {/* ============================================================ */}
      <section className="parchment-card parchment-card-inner relative overflow-hidden p-6 sm:p-10 lg:p-12">
        {/* Concentric Decorative Rings Behind Hero */}
        <div className="absolute -right-32 -top-32 pointer-events-none opacity-40">
          <ConcentricRings size={620} />
        </div>

        {/* Corner Flourishes */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <CornerFlourish position="tl" size={24} />
        </div>
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <CornerFlourish position="tr" size={24} />
        </div>
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
          <CornerFlourish position="bl" size={24} />
        </div>
        <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
          <CornerFlourish position="br" size={24} />
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          {/* Hero Copy & Controls */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b08d3c]/40 bg-[#f6efe0] px-3 py-0.5 font-cinzel text-[11px] font-bold uppercase tracking-wider text-[#8c6b24]">
                <ArcTestnetSeal size={12} className="text-[#b08d3c]" />
                Arc L1 Sovereign Stablecoin Network
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4c5d34]/40 bg-[#edf5e5] px-3 py-0.5 font-cinzel text-[11px] font-semibold uppercase tracking-wider text-[#2f3a20]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4c5d34]" />
                Live Solvency Enforcement
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.03em] text-[#1a1f12] leading-[1.08]">
              The Royal Granary of OWatch
            </h1>

            <p className="max-w-3xl lg:max-w-4xl font-serif text-base sm:text-lg text-[#3c4132] leading-relaxed">
              An autonomous AI treasury guardian operating on Arc (Circle L1). The keeper monitors the community reserve, honors viewer reward redemptions with instant finality, disburses creator earnings, and enforces strict smart contract caps carved into on-chain law.
            </p>

            {/* Quick Hero Stat Chips in 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono text-xs max-w-3xl xl:max-w-4xl">
              <div className="rounded-md border border-[#d6d6c8] bg-[#fbfaf6] px-3.5 py-2">
                <span className="block font-cinzel text-[10px] uppercase text-[#6b6e5d]">
                  Vault Balance:
                </span>
                <span className="text-sm font-bold text-[#1a1f12]">
                  {formatMicro(vaultInfo.balanceMicro)}
                </span>
              </div>
              <div className="rounded-md border border-[#d6d6c8] bg-[#fbfaf6] px-3.5 py-2">
                <span className="block font-cinzel text-[10px] uppercase text-[#6b6e5d]">
                  Viewer Payouts:
                </span>
                <span className="text-sm font-bold text-[#4c5d34]">
                  {stats.traction.payouts} completed
                </span>
              </div>
              <div className="rounded-md border border-[#d6d6c8] bg-[#fbfaf6] px-3.5 py-2">
                <span className="block font-cinzel text-[10px] uppercase text-[#6b6e5d]">
                  Sub-Minute Rate:
                </span>
                <span className="text-sm font-bold text-[#8c6b24]">
                  {(stats.traction.onTimeRate * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Navigation Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link href="/app/approvals" className="btn-royal-secondary">
                <span className="text-[#b08d3c] mr-1.5">III.</span>
                Royal Seal Approvals
              </Link>
              <Link href="/app/decisions" className="btn-royal-ink">
                <span className="text-[#b08d3c] mr-1.5">II.</span>
                Chronicle of Decisions →
              </Link>
              <Link href="/app/metrics" className="btn-royal-secondary">
                <span className="text-[#b08d3c] mr-1.5">IV.</span>
                Treasury Records
              </Link>
            </div>
          </div>

          {/* Javanese Rice Barn (Lumbung) Line-Art Engraving */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-xs rounded-2xl border border-[#d6d6c8] bg-[#fbfaf6] p-5 shadow-xs">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[#b08d3c]/50 bg-[#f5f3ea] px-3 py-0.5 font-cinzel text-[9px] font-bold uppercase tracking-widest text-[#8c6b24]">
                Lumbung · Rice Barn on Stilts
              </div>
              <LumbungBarn size={220} className="mx-auto" />
              <div className="mt-2 text-center font-serif text-[11px] italic text-[#6b6e5d]">
                &ldquo;Filled at harvest, opened wisely in lean season.&rdquo;
              </div>
            </div>
          </div>
        </div>
      </section>

      <ConfigNotice
        isDbConfigured={stats.configured}
        isVaultConfigured={vaultInfo.configured}
      />

      {/* ============================================================ */}
      {/* SECTION I: Solvency Reserve Gauge                            */}
      {/* ============================================================ */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-bold text-[#b08d3c]">I.</span>
          <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-[-0.02em] text-[#1a1f12]">
            Granary Solvency & Reserve Ratio
          </h2>
        </div>
        <p className="font-serif text-xs sm:text-sm text-[#6b6e5d] italic">
          Continuous solvency verification balancing on-chain USDC reserves against outstanding viewer reward liabilities.
        </p>

        <ReserveGauge
          reserveRatio={stats.solvency.reserveRatio}
          balanceMicro={vaultInfo.balanceMicro}
          liabilityMicro={BigInt(stats.solvency.liabilityMicro)}
          runwayDays={stats.solvency.runwayDays}
        />
      </section>

      <DividerFlourish />

      {/* ============================================================ */}
      {/* SECTION II: Smart Contract Budget Granaries                  */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold text-[#b08d3c]">II.</span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-[-0.02em] text-[#1a1f12]">
              Smart Contract Granary Envelopes
            </h2>
          </div>
          <p className="font-serif text-xs sm:text-sm text-[#6b6e5d] italic">
            Enforced autonomously by <code>LumbungVault.sol</code> on Arc Testnet. The AI agent cannot talk past these hard caps without owner approval.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <BudgetEnvelopeCard
            category="REWARD"
            dailyCap={rewardDailyCap}
            spentInDay={rewardSpent}
            remainingToday={vaultInfo.remainingToday.REWARD || rewardDailyCap}
            perTxCap={vaultInfo.perTxCap.REWARD}
            description="Viewer watch-to-earn loyalty reward disbursements honoring community harvests"
          />
          <BudgetEnvelopeCard
            category="CREATOR"
            dailyCap={creatorDailyCap}
            spentInDay={creatorSpent}
            remainingToday={vaultInfo.remainingToday.CREATOR || creatorDailyCap}
            perTxCap={vaultInfo.perTxCap.CREATOR}
            description="Video creators, editorial scribes, and community promoter disbursements"
          />
          <BudgetEnvelopeCard
            category="OPS"
            dailyCap={opsDailyCap}
            spentInDay={opsSpent}
            remainingToday={vaultInfo.remainingToday.OPS || opsDailyCap}
            perTxCap={vaultInfo.perTxCap.OPS}
            description="Gas sponsorship reserves and protocol operational maintenance"
          />
        </div>
      </section>

      <DividerFlourish />

      {/* ============================================================ */}
      {/* SECTION III: Recent Chronicle of Decisions                   */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold text-[#b08d3c]">III.</span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-[-0.02em] text-[#1a1f12]">
                Recent Chronicle of Decisions
              </h2>
            </div>
            <p className="font-serif text-xs sm:text-sm text-[#6b6e5d] italic">
              Latest evaluations recorded with agent reasoning, risk factors, and cryptographic hash
            </p>
          </div>
          <Link
            href="/app/decisions"
            className="btn-royal-secondary text-[11px] py-1.5 px-3 self-start sm:self-auto"
          >
            Open Complete Ledger ({stats.traction.payouts} payouts) →
          </Link>
        </div>

        <div className="parchment-card parchment-card-inner overflow-hidden">
          {latestDecisions.length === 0 ? (
            <div className="p-10 text-center font-serif text-sm italic text-[#6b6e5d]">
              No decisions recorded yet. Once redemptions arrive, they will be inscribed here with full cryptographic audit.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#d6d6c8] bg-[#f2ede2]/70 font-cinzel text-[11px] uppercase tracking-wider text-[#6b6e5d]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Recipient</th>
                    <th className="px-4 py-3 font-semibold">Granary</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Keeper Reasoning</th>
                    <th className="px-4 py-3 font-semibold text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e3d8]">
                  {latestDecisions.map((d) => (
                    <tr
                      key={d.id}
                      className="transition-colors hover:bg-[#f2ede2]/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-[#6b6e5d]">
                        {new Date(d.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#1a1f12]">
                        {d.toWallet ? (
                          <a
                            href={`${explorerUrl}/address/${d.toWallet}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-[#4c5d34]"
                          >
                            {truncate(d.toWallet)}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={d.category} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-[#1a1f12]">
                        {formatMicro(parseMicro(d.amountMicro))}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={d.action} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="max-w-md lg:max-w-xl xl:max-w-3xl truncate px-4 py-3 font-serif text-xs italic text-[#3c4132]">
                        &ldquo;{d.reasoning}&rdquo;
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link
                          href={`/app/decisions/${d.id}`}
                          className="font-cinzel text-[11px] font-bold text-[#8c6b24] hover:text-[#b08d3c]"
                        >
                          Audit →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
