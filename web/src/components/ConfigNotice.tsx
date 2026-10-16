import React from "react";
import { CornerFlourish } from "./ornaments/CornerFlourish";
import { RoyalSeal } from "./ornaments/RoyalSeal";

export function ConfigNotice({
  isDbConfigured,
  isVaultConfigured,
}: {
  isDbConfigured: boolean;
  isVaultConfigured: boolean;
}) {
  if (isDbConfigured && isVaultConfigured) {
    return null;
  }

  return (
    <div className="relative mb-8 overflow-hidden rounded-xl border border-[#b08d3c]/40 bg-[#f6efe0]/90 p-5 shadow-xs">
      {/* Corner Flourishes */}
      <div className="absolute top-1.5 left-1.5">
        <CornerFlourish position="tl" size={20} />
      </div>
      <div className="absolute top-1.5 right-1.5">
        <CornerFlourish position="tr" size={20} />
      </div>
      <div className="absolute bottom-1.5 left-1.5">
        <CornerFlourish position="bl" size={20} />
      </div>
      <div className="absolute bottom-1.5 right-1.5">
        <CornerFlourish position="br" size={20} />
      </div>

      <div className="flex items-start gap-4 px-2 py-1">
        <RoyalSeal size={32} variant="gold" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#785918]">
              Royal Proclamation
            </span>
            <span className="text-[#b08d3c]">·</span>
            <span className="font-serif text-sm font-semibold text-[#1a1f12]">
              Environment In Awaiting State
            </span>
          </div>

          <p className="mt-1 font-serif text-xs leading-relaxed text-[#3c4132]">
            {!isDbConfigured && !isVaultConfigured && (
              <span>
                Both <code className="rounded border border-[#b08d3c]/30 bg-[#fbfaf6] px-1 py-0.5 font-mono text-[11px] text-[#785918]">DATABASE_URL</code> and{" "}
                <code className="rounded border border-[#b08d3c]/30 bg-[#fbfaf6] px-1 py-0.5 font-mono text-[11px] text-[#785918]">LUMBUNG_VAULT_ADDRESS</code> remain unconfigured. The treasury is operating in graceful preview mode with archival testnet defaults.
              </span>
            )}
            {!isDbConfigured && isVaultConfigured && (
              <span>
                <code className="rounded border border-[#b08d3c]/30 bg-[#fbfaf6] px-1 py-0.5 font-mono text-[11px] text-[#785918]">DATABASE_URL</code> is not configured. On-chain vault states are live from Arc Testnet, while the historical decision chronicle awaits database connection.
              </span>
            )}
            {isDbConfigured && !isVaultConfigured && (
              <span>
                <code className="rounded border border-[#b08d3c]/30 bg-[#fbfaf6] px-1 py-0.5 font-mono text-[11px] text-[#785918]">LUMBUNG_VAULT_ADDRESS</code> is not configured. Decision records are live from Postgres, awaiting vault contract deployment on Arc Testnet.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
