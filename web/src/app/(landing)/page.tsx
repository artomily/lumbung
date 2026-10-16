import React from "react";
import Link from "next/link";
import Image from "next/image";
import { formatMicro } from "@/lib/money";
import { env } from "@/lib/env";
import { getPublicStats, getVaultInfo } from "@/lib/queries";
import { RoyalSeal } from "@/components/ornaments/RoyalSeal";
import { ArcTestnetSeal } from "@/components/ornaments/ArcTestnetSeal";
import { ConcentricRings } from "@/components/ornaments/ConcentricRings";
import { CornerFlourish } from "@/components/ornaments/CornerFlourish";
import { RiceStalkDivider } from "@/components/landing/RiceStalkDivider";
import { RomanMedallion } from "@/components/landing/RomanMedallion";
import { WaxSealStamp } from "@/components/landing/WaxSealStamp";
import { JourneyMap } from "@/components/landing/JourneyMap";
import { PillarsMedallions } from "@/components/landing/PillarsMedallions";
import { CoinToken } from "@/components/landing/CoinToken";
import { FaqAccordion } from "@/components/landing/FaqAccordion";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [stats, vaultInfo] = await Promise.all([
    getPublicStats(),
    getVaultInfo(),
  ]);

  const explorerUrl = env.NEXT_PUBLIC_ARC_EXPLORER || "https://explorer.testnet.arc.io";
  const owatchUrl = env.NEXT_PUBLIC_OWATCH_URL || null;

  // Real ledger values with graceful fallback
  const isVaultReady = vaultInfo.configured && vaultInfo.balanceMicro > 0n;
  const isDbReady = stats.configured;

  const vaultBalanceDisplay = isVaultReady
    ? formatMicro(vaultInfo.balanceMicro)
    : "Awaiting seed";

  const liabilityMicroBigInt = BigInt(stats.solvency.liabilityMicro || "0");
  const liabilityDisplay = isDbReady && liabilityMicroBigInt > 0n
    ? formatMicro(liabilityMicroBigInt)
    : "—";

  const reserveRatioDisplay = isDbReady && stats.solvency.reserveRatio > 0
    ? `${stats.solvency.reserveRatio >= 999 ? "∞" : stats.solvency.reserveRatio.toFixed(2)}x`
    : "—";

  const payoutsCountDisplay = isDbReady && stats.traction.payouts > 0
    ? `${stats.traction.payouts}`
    : "—";

  const usdcPaidMicroBigInt = BigInt(stats.traction.usdcPaidMicro || "0");
  const usdcMovedDisplay = isDbReady && usdcPaidMicroBigInt > 0n
    ? formatMicro(usdcPaidMicroBigInt)
    : "—";

  const uniqueViewersDisplay = isDbReady && stats.traction.uniqueUsersPaid > 0
    ? `${stats.traction.uniqueUsersPaid}`
    : "—";

  return (
    <div className="page-container w-full px-4 sm:px-6 lg:px-10 xl:px-14 space-y-16 py-6 sm:py-10">
      {/* ============================================================ */}
      {/* HERO SECTION: The Open Granary of OWatch                     */}
      {/* Direct on parchment - NO white card container behind barn    */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden py-6 sm:py-12 lg:py-16 bg-[#f5f3ea]">
        <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          {/* Hero Copy (Cut by ~50%, punchy & accurate) */}
          <div className="lg:col-span-6 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b08d3c]/40 bg-[#f6efe0] px-3 py-1 font-cinzel text-[11px] font-bold uppercase tracking-wider text-[#8c6b24]">
                <ArcTestnetSeal size={14} className="text-[#b08d3c]" />
                Arc L1 Sovereign Stablecoin Network
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4c5d34]/40 bg-[#edf5e5] px-3 py-1 font-cinzel text-[11px] font-semibold uppercase tracking-wider text-[#2f3a20]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4c5d34]" />
                Live Solvency Enforcement
              </span>
            </div>

            <div className="space-y-2">
              <p className="font-cinzel text-xs uppercase tracking-[0.2em] text-[#8c6b24]">
                Lumbung Padi Digital · Setiap Butir Terjamin
              </p>
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.03em] text-[#1a1f12] leading-[1.06]">
                The Open Granary of OWatch
              </h1>
            </div>

            <p className="font-serif text-base sm:text-xl text-[#3c4132] leading-relaxed max-w-xl">
              Every reward point backed by real reserves. Every payout executed autonomously on Arc. Lumbung balances viewer loyalty debt against verifiable on-chain USDC.
            </p>

            <div className="p-3.5 rounded-lg border border-[#d6d6c8] bg-[#fbfaf6]/70 max-w-xl font-serif text-xs sm:text-sm text-[#4c5d34] italic leading-snug">
              &ldquo;In Indonesian villages, the communal <strong>lumbung</strong> (rice barn) is stocked at harvest and opened prudently during lean season. Lumbung brings collective solvency to digital rewards.&rdquo;
            </div>

            {/* Hero CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/app" className="btn-royal-ink text-xs sm:text-sm py-2.5 px-5">
                <span className="text-[#b08d3c] mr-2">I.</span>
                Enter the Treasury
              </Link>
              <Link href="/app/decisions" className="btn-royal-secondary text-xs sm:text-sm py-2.5 px-5">
                <span className="text-[#8c6b24] mr-2">II.</span>
                Read the Chronicle →
              </Link>
              {owatchUrl && (
                <a
                  href={owatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-royal-secondary text-xs sm:text-sm py-2.5 px-5"
                >
                  Visit OWatch ↗
                </a>
              )}
            </div>
          </div>

          {/* Large Engraved Barn Illustration (Direct on Parchment, No White Card) */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
            <div className="relative flex flex-col items-center justify-center w-full max-w-xl bg-[#f5f3ea]">
              <div className="relative w-full aspect-square max-w-[500px] sm:max-w-[560px] lg:max-w-[600px] flex items-center justify-center bg-[#f5f3ea]">
                {/* Concentric rings ornament subtly framing the barn */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
                  <ConcentricRings size={600} />
                </div>
                <Image
                  src="/illustrations/lumbung-hero-barn.webp"
                  alt="Lumbung rice barn on stilts"
                  width={600}
                  height={600}
                  priority
                  unoptimized
                  className="relative z-10 w-full h-auto max-w-[500px] sm:max-w-[560px] lg:max-w-[600px] object-contain mix-blend-multiply select-none pointer-events-none"
                />
              </div>
              <div className="text-center space-y-0.5 max-w-sm mt-1">
                <div className="font-cinzel text-[11px] font-bold uppercase tracking-widest text-[#8c6b24]">
                  Lumbung · Village Granary on Stilts
                </div>
                <p className="font-serif text-xs italic text-[#5a5d4e]">
                  &ldquo;Filled at harvest, opened wisely in lean season.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <RiceStalkDivider />

      {/* ============================================================ */}
      {/* SECTION I: OWatch Today — Two Illustrated Panels             */}
      {/* ============================================================ */}
      <section id="economy" className="space-y-6 scroll-mt-24 animate-on-scroll">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2.5">
          <div className="flex items-center gap-2.5">
            <RomanMedallion numeral="I" size="md" variant="gold" />
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#1a1f12]">
              OWatch Today: A Live Economy
            </h2>
          </div>
          <span className="font-serif text-sm text-[#6b6e5d] italic">
            A watch-to-earn mobile ecosystem serving viewers in Indonesia
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Panel 1: Viewers Earn (vignette-viewer) */}
          <div className="parchment-card parchment-card-inner p-6 sm:p-8 flex flex-col justify-between gap-5 bg-[#fbfaf6]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#8c6b24]">
                  Attention Economy
                </span>
                <span className="rounded-full border border-[#4c5d34]/40 bg-[#edf5e5] px-2.5 py-0.5 font-cinzel text-[10px] font-bold text-[#2f3a20] uppercase tracking-wider">
                  Mobile Viewers
                </span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1a1f12]">
                Viewers Watch & Earn
              </h3>
              <p className="font-serif text-sm text-[#3c4132] leading-snug">
                Indonesian audiences stream educational videos and earn loyalty points to cover daily essentials.
              </p>
            </div>

            {/* Illustration */}
            <div className="relative w-full aspect-4/3 max-w-[340px] mx-auto flex items-center justify-center my-1 bg-[#fbfaf6]">
              <Image
                src="/illustrations/vignette-viewer.webp"
                alt=""
                width={435}
                height={428}
                loading="lazy"
                className="w-full h-full object-contain mix-blend-multiply select-none pointer-events-none"
              />
            </div>

            {/* 3 Short Bullets */}
            <ul className="space-y-2 font-serif text-xs sm:text-sm text-[#3c4132] border-t border-[#e5e3d8] pt-4">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#8c6b24]">✓</span>
                <span>Supplemental income delivered directly to real community audiences.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#8c6b24]">✓</span>
                <span>Zero crypto friction: watch content, accumulate verified reward points.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#8c6b24]">✓</span>
                <span>Attention proof synchronized with Lumbung every 10 minutes.</span>
              </li>
            </ul>
          </div>

          {/* Panel 2: Redeem & Exchange (vignette-exchange) */}
          <div className="parchment-card parchment-card-inner p-6 sm:p-8 flex flex-col justify-between gap-5 bg-[#fbfaf6]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#8c6b24]">
                  Instant Liquidity
                </span>
                <span className="rounded-full border border-[#b08d3c]/40 bg-[#f6efe0] px-2.5 py-0.5 font-cinzel text-[10px] font-bold text-[#8c6b24] uppercase tracking-wider">
                  USDC Redemption
                </span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1a1f12]">
                Points Exchanged for USDC
              </h3>
              <p className="font-serif text-sm text-[#3c4132] leading-snug">
                Viewers redeem accumulated points for digital dollars disbursed directly to their sovereign wallets.
              </p>
            </div>

            {/* Illustration */}
            <div className="relative w-full aspect-4/3 max-w-[340px] mx-auto flex items-center justify-center my-1 bg-[#fbfaf6]">
              <Image
                src="/illustrations/vignette-exchange.webp"
                alt=""
                width={508}
                height={410}
                loading="lazy"
                className="w-full h-full object-contain mix-blend-multiply select-none pointer-events-none"
              />
            </div>

            {/* 3 Short Bullets */}
            <ul className="space-y-2 font-serif text-xs sm:text-sm text-[#3c4132] border-t border-[#e5e3d8] pt-4">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#b08d3c]">✓</span>
                <span>Sub-dollar micro-payouts ($0.10–$0.50) unlocked by Arc&apos;s $0.01 gas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#b08d3c]">✓</span>
                <span>Idempotent signed webhooks eliminate duplicate redemptions.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#b08d3c]">✓</span>
                <span>Every point liability backed by verified on-chain USDC reserves.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <RiceStalkDivider />

      {/* ============================================================ */}
      {/* SECTION II: Following the Money — The Granary Cycle          */}
      {/* Illustrated 6-step journey with dashed ink route             */}
      {/* ============================================================ */}
      <section id="cycle" className="space-y-6 scroll-mt-24 relative animate-on-scroll">
        <div id="how" className="absolute -top-24 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2.5">
          <div className="flex items-center gap-2.5">
            <RomanMedallion numeral="II" size="md" variant="gold" />
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#1a1f12]">
              Following the Money: The Granary Cycle
            </h2>
          </div>
          <span className="font-serif text-sm text-[#6b6e5d] italic">
            End-to-end journey from vault harvest deposit to verified on-chain disbursement
          </span>
        </div>

        {/* 6 Vignettes Journey Map */}
        <JourneyMap />
      </section>

      <RiceStalkDivider />

      {/* ============================================================ */}
      {/* SECTION III: Why It Is Transparent — 4 Pillars + Keeper       */}
      {/* ============================================================ */}
      <section id="transparency" className="space-y-6 scroll-mt-24 animate-on-scroll">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <RomanMedallion numeral="III" size="md" variant="gold" />
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#1a1f12]">
                Why It Is Transparent: Verifiable by Design
              </h2>
            </div>
            <p className="font-serif text-sm text-[#6b6e5d] italic">
              Zero black boxes: cryptographic proofs, smart contract envelopes, and immutable logs
            </p>
          </div>

          {/* Rotated Wax Seal Stamp */}
          <div className="shrink-0 self-center sm:self-auto">
            <WaxSealStamp size={110} rotation={-8} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-center">
          {/* Large Pen-and-Ink Engraved Keeper Illustration */}
          <div className="lg:col-span-5 parchment-card parchment-card-inner p-6 flex flex-col items-center text-center justify-between gap-4 bg-[#fbfaf6]">
            <div className="relative w-full aspect-4/3 max-w-[360px] flex items-center justify-center bg-[#fbfaf6]">
              <Image
                src="/illustrations/vignette-keeper.webp"
                alt=""
                width={496}
                height={425}
                loading="lazy"
                className="w-full h-full object-contain mix-blend-multiply select-none pointer-events-none"
              />
            </div>
            <div className="space-y-1">
              <span className="font-cinzel text-xs font-bold uppercase tracking-widest text-[#8c6b24]">
                The Royal Keeper
              </span>
              <p className="font-serif text-xs text-[#3c4132] leading-snug max-w-sm">
                Evaluating solvency, velocity limits, and deterministic rules before authorizing any disbursement.
              </p>
            </div>
          </div>

          {/* 4 Pillars as Ornamented Icon Medallions */}
          <div className="lg:col-span-7">
            <PillarsMedallions />
          </div>
        </div>
      </section>

      <RiceStalkDivider />

      {/* ============================================================ */}
      {/* SECTION IV: Live Ledger Numbers (Engraved Coin Tokens)       */}
      {/* ============================================================ */}
      <section id="telemetry" className="space-y-6 scroll-mt-24 animate-on-scroll">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2.5">
          <div className="flex items-center gap-2.5">
            <RomanMedallion numeral="IV" size="md" variant="gold" />
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#1a1f12]">
              Live Ledger Telemetry
            </h2>
          </div>
          <span className="font-serif text-sm text-[#6b6e5d] italic">
            Authentic live numbers from the Arc blockchain and decision database (simulations excluded)
          </span>
        </div>

        {/* 6 Circular Engraved Coin Tokens */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
          <CoinToken
            label="Vault Reserve"
            value={vaultBalanceDisplay}
            subtitle="On-chain USDC"
            variant="gold"
          />
          <CoinToken
            label="Points Liability"
            value={liabilityDisplay}
            subtitle="OWatch points"
            variant="ink"
          />
          <CoinToken
            label="Reserve Ratio"
            value={reserveRatioDisplay}
            subtitle="Solvency ratio"
            variant="sage"
          />
          <CoinToken
            label="Payouts Executed"
            value={payoutsCountDisplay}
            subtitle="Autonomous on Arc"
            variant="gold"
          />
          <CoinToken
            label="USDC Moved"
            value={usdcMovedDisplay}
            subtitle="Disbursed to viewers"
            variant="ink"
          />
          <CoinToken
            label="Unique Viewers"
            value={uniqueViewersDisplay}
            subtitle="Wallets paid"
            variant="sage"
          />
        </div>

        <div className="text-right pt-2">
          <Link
            href="/app/metrics"
            className="font-cinzel text-xs font-semibold text-[#8c6b24] hover:text-[#b08d3c] transition-colors inline-flex items-center gap-1.5"
          >
            <span>Inspect Detailed Telemetry & Charts</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <RiceStalkDivider />

      {/* ============================================================ */}
      {/* SECTION V: How to Verify Yourself (3 Steps + Vignette)       */}
      {/* ============================================================ */}
      <section id="verify" className="space-y-6 scroll-mt-24 animate-on-scroll">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2.5">
          <div className="flex items-center gap-2.5">
            <RomanMedallion numeral="V" size="md" variant="gold" />
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#1a1f12]">
              How to Verify Yourself (3 Steps)
            </h2>
          </div>
          <span className="font-serif text-sm text-[#6b6e5d] italic">
            Zero trust needed: independently audit any payout in seconds
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-center">
          {/* Left: Large Vignette-Verify Illustration */}
          <div className="lg:col-span-5 parchment-card parchment-card-inner p-6 flex flex-col items-center text-center justify-between gap-4 bg-[#fbfaf6]">
            <div className="relative w-full aspect-4/3 max-w-[360px] flex items-center justify-center bg-[#fbfaf6]">
              <Image
                src="/illustrations/vignette-verify.webp"
                alt=""
                width={503}
                height={384}
                loading="lazy"
                className="w-full h-full object-contain mix-blend-multiply select-none pointer-events-none"
              />
            </div>
            <div className="space-y-1">
              <span className="font-cinzel text-xs font-bold uppercase tracking-widest text-[#8c6b24]">
                Cryptographic Verification
              </span>
              <p className="font-serif text-xs text-[#3c4132] leading-snug max-w-sm">
                Every payout commits a keccak256 reasonHash to Arc, verifiable in any web browser.
              </p>
            </div>
          </div>

          {/* Right: 3 Numbered Steps as Illustrated Stamps */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="parchment-card parchment-card-inner p-5 flex flex-col justify-between gap-3 relative">
              <div className="flex items-center justify-between">
                <RomanMedallion numeral="1" size="sm" variant="gold" />
                <span className="font-cinzel text-[10px] font-bold text-[#8c6b24] uppercase">
                  Feed
                </span>
              </div>
              <h3 className="font-serif text-base font-bold text-[#1a1f12]">
                Pick a Decision
              </h3>
              <p className="font-serif text-xs text-[#3c4132] leading-relaxed">
                Open the <Link href="/app/decisions" className="underline font-semibold text-[#8c6b24]">Chronicle</Link> to inspect any confirmed payout.
              </p>
            </div>

            {/* Step 2 */}
            <div className="parchment-card parchment-card-inner p-5 flex flex-col justify-between gap-3 relative">
              <div className="flex items-center justify-between">
                <RomanMedallion numeral="2" size="sm" variant="sage" />
                <span className="font-cinzel text-[10px] font-bold text-[#2f3a20] uppercase">
                  Arc L1
                </span>
              </div>
              <h3 className="font-serif text-base font-bold text-[#1a1f12]">
                Inspect Receipt
              </h3>
              <p className="font-serif text-xs text-[#3c4132] leading-relaxed">
                Click tx hash on <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold text-[#4c5d34]">Explorer</a> to view the <code>Paid</code> event.
              </p>
            </div>

            {/* Step 3 */}
            <div className="parchment-card parchment-card-inner p-5 flex flex-col justify-between gap-3 relative">
              <div className="flex items-center justify-between">
                <RomanMedallion numeral="3" size="sm" variant="ink" />
                <span className="font-cinzel text-[10px] font-bold text-[#1a1f12] uppercase">
                  Proof
                </span>
              </div>
              <h3 className="font-serif text-base font-bold text-[#1a1f12]">
                Recompute Hash
              </h3>
              <p className="font-serif text-xs text-[#3c4132] leading-relaxed">
                Click &ldquo;Verify reasonHash&rdquo; to re-hash the snapshot and match on-chain proof.
              </p>
            </div>
          </div>
        </div>
      </section>

      <RiceStalkDivider />

      {/* ============================================================ */}
      {/* SECTION VI: Frequently Asked Questions (Compact Accordion)   */}
      {/* ============================================================ */}
      <section id="faq" className="space-y-6 scroll-mt-24 animate-on-scroll">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2.5">
          <div className="flex items-center gap-2.5">
            <RomanMedallion numeral="VI" size="md" variant="gold" />
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#1a1f12]">
              Frequently Asked Questions
            </h2>
          </div>
          <span className="font-serif text-sm text-[#6b6e5d] italic">
            Clarity on custody, safety, network choices, and governance
          </span>
        </div>

        {/* Pure HTML details/summary accordion */}
        <FaqAccordion />
      </section>

      {/* ============================================================ */}
      {/* FINAL CALL TO ACTION                                         */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden rounded-2xl border border-[#b08d3c]/50 bg-radial from-[#fdfbf6] via-[#f7f2e7] to-[#eee6d4] p-8 sm:p-12 text-center space-y-4 animate-on-scroll shadow-md">
        {/* Subtle corner flourishes */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <CornerFlourish position="tl" size={24} />
        </div>
        <div className="absolute top-3 right-3 pointer-events-none">
          <CornerFlourish position="tr" size={24} />
        </div>
        <div className="absolute bottom-3 left-3 pointer-events-none">
          <CornerFlourish position="bl" size={24} />
        </div>
        <div className="absolute bottom-3 right-3 pointer-events-none">
          <CornerFlourish position="br" size={24} />
        </div>

        <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#b08d3c] bg-[#f2ede2]">
          <RoyalSeal size={32} variant="gold" />
        </div>
        <h2 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-[#1a1f12]">
          Step into the Royal Granary
        </h2>
        <p className="mx-auto max-w-xl font-serif text-sm sm:text-base text-[#3c4132]">
          Audit the live solvency ratio, inspect budget envelopes, or review every autonomous decision on Arc.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/app" className="btn-royal-ink text-xs sm:text-sm py-2.5 px-6">
            Enter Treasury Dashboard (/app) →
          </Link>
          <Link href="/app/decisions" className="btn-royal-secondary text-xs sm:text-sm py-2.5 px-6">
            Audit Chronicle of Decisions
          </Link>
        </div>
      </section>
    </div>
  );
}
