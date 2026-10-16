import React from "react";
import { formatMicro } from "@/lib/money";
import { CornerFlourish } from "./ornaments/CornerFlourish";
import { RoyalSeal } from "./ornaments/RoyalSeal";

export function ReserveGauge({
  reserveRatio,
  balanceMicro,
  liabilityMicro,
  runwayDays,
}: {
  reserveRatio: number;
  balanceMicro: bigint;
  liabilityMicro: bigint;
  runwayDays: number | null;
}) {
  const isLow = reserveRatio >= 0.5 && reserveRatio < 1.0;
  const isCritical = reserveRatio < 0.5 && liabilityMicro > 0n;

  let statusLabel = "Abundant Solvency";
  let statusBadge = "bg-[#edf5e5] text-[#2f3a20] border-[#93bd63]/60";
  let statusDesc = "The royal vault holds more USDC than all outstanding viewer loyalty claims combined.";

  if (isLow) {
    statusLabel = "Lean Season Warning";
    statusBadge = "bg-[#f6efe0] text-[#785918] border-[#b08d3c]/60";
    statusDesc = "Reserve ratio below 1.0x. Policy R9 conserves treasury: payouts ≤ 1 USDC proceed; larger claims held.";
  } else if (isCritical) {
    statusLabel = "Critical Granary Scarcity";
    statusBadge = "bg-[#fcf0ee] text-[#8c2a24] border-[#d9857e]/60";
    statusDesc = "Reserve ratio below 0.5x. Policy R8 halts non-essential disbursements to preserve kingdom reserves.";
  } else if (liabilityMicro === 0n && balanceMicro === 0n) {
    statusLabel = "Awaiting Harvest Deposit";
    statusBadge = "bg-[#f2ede2] text-[#3c4132] border-[#d6d6c8]";
    statusDesc = "Deposit testnet USDC to awaken real-time solvency tracking and autonomous payouts.";
  }

  // Visual meter percent
  const displayRatio = reserveRatio >= 999 ? "∞" : `${reserveRatio.toFixed(2)}x`;
  const barPercent = Math.min(Math.max(reserveRatio * 50, 4), 100);

  return (
    <div className="parchment-card parchment-card-inner relative overflow-hidden p-6 sm:p-8">
      {/* Corner Flourishes */}
      <div className="absolute top-2 left-2 z-10">
        <CornerFlourish position="tl" size={24} />
      </div>
      <div className="absolute top-2 right-2 z-10">
        <CornerFlourish position="tr" size={24} />
      </div>
      <div className="absolute bottom-2 left-2 z-10">
        <CornerFlourish position="bl" size={24} />
      </div>
      <div className="absolute bottom-2 right-2 z-10">
        <CornerFlourish position="br" size={24} />
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <RoyalSeal size={28} variant={isCritical ? "ink" : isLow ? "gold" : "sage"} />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-cinzel text-xs font-bold uppercase tracking-widest text-[#6b6e5d]">
                  Granary Solvency Ratio
                </h2>
                <span
                  className={`inline-flex items-center rounded-sm border px-2.5 py-0.5 font-cinzel text-[11px] font-semibold uppercase tracking-wider ${statusBadge}`}
                >
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 font-serif text-xs text-[#6b6e5d] italic">
                {statusDesc}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-baseline gap-2 self-start sm:self-auto">
          <span className="font-serif text-4xl font-bold tracking-tight text-[#1a1f12]">
            {displayRatio}
          </span>
          <span className="font-cinzel text-[11px] font-semibold uppercase tracking-wider text-[#785918]">
            Reserve / Debt
          </span>
        </div>
      </div>

      {/* Progress meter styled like an ancient brass / ivory scale */}
      <div className="mt-6">
        <div className="relative h-3 w-full overflow-hidden rounded-full border border-[#d6d6c8] bg-[#e8e9dd] p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isCritical
                ? "bg-[#8c2a24]"
                : isLow
                ? "bg-[#b08d3c]"
                : "bg-gradient-to-r from-[#4c5d34] to-[#6e9442]"
            }`}
            style={{ width: `${barPercent}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-[#6b6e5d]">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8c2a24]" /> 0.0x (Depleted)
          </span>
          <span className="flex items-center gap-1 font-semibold text-[#785918]">
            1.0x (Parity Point)
          </span>
          <span className="flex items-center gap-1 text-[#4c5d34] font-semibold">
            2.0x+ (Treasury Surplus) <span className="h-1.5 w-1.5 rounded-full bg-[#4c5d34]" />
          </span>
        </div>
      </div>

      {/* Underlying stats grid */}
      <div className="mt-7 grid grid-cols-1 gap-4 border-t border-[#d6d6c8] pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-[#e5e3d8] bg-[#fbfaf6] p-3.5">
          <span className="font-cinzel text-[11px] font-semibold uppercase tracking-wider text-[#6b6e5d]">
            Royal Vault Reserves
          </span>
          <p className="mt-1 font-mono text-xl font-bold text-[#1a1f12]">
            {formatMicro(balanceMicro)}
          </p>
          <span className="text-[10px] text-[#785918] font-serif italic">
            On-chain Arc USDC
          </span>
        </div>

        <div className="rounded-md border border-[#e5e3d8] bg-[#fbfaf6] p-3.5">
          <span className="font-cinzel text-[11px] font-semibold uppercase tracking-wider text-[#6b6e5d]">
            Viewer Points Liability
          </span>
          <p className="mt-1 font-mono text-xl font-bold text-[#1a1f12]">
            {formatMicro(liabilityMicro)}
          </p>
          <span className="text-[10px] text-[#6b6e5d] font-serif italic">
            Outstanding promises to redeem
          </span>
        </div>

        <div className="rounded-md border border-[#e5e3d8] bg-[#fbfaf6] p-3.5">
          <span className="font-cinzel text-[11px] font-semibold uppercase tracking-wider text-[#6b6e5d]">
            Coverage Status
          </span>
          <p className="mt-1 font-mono text-xl font-bold text-[#4c5d34]">
            {displayRatio}
          </p>
          <span className="text-[10px] text-[#4c5d34] font-serif italic">
            {statusLabel}
          </span>
        </div>

        <div className="rounded-md border border-[#e5e3d8] bg-[#fbfaf6] p-3.5">
          <span className="font-cinzel text-[11px] font-semibold uppercase tracking-wider text-[#6b6e5d]">
            Estimated Harvest Runway
          </span>
          <p className="mt-1 font-mono text-xl font-bold text-[#2f3a20]">
            {runwayDays !== null ? `${runwayDays} days` : "Abundant"}
          </p>
          <span className="text-[10px] text-[#4c5d34] font-serif italic">
            Solvent payout horizon
          </span>
        </div>
      </div>
    </div>
  );
}
