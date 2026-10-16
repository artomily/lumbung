import React from "react";
import { formatMicro } from "@/lib/money";
import { CategoryBadge } from "./Badges";
import { CornerFlourish } from "./ornaments/CornerFlourish";

export function BudgetEnvelopeCard({
  category,
  dailyCap,
  spentInDay,
  remainingToday,
  perTxCap,
  description,
}: {
  category: "REWARD" | "CREATOR" | "OPS";
  dailyCap: bigint;
  spentInDay: bigint;
  remainingToday: bigint;
  perTxCap: bigint;
  description: string;
}) {
  const percentUsed =
    dailyCap > 0n
      ? Math.min(Number((spentInDay * 100n) / dailyCap), 100)
      : 0;

  const categoryTitles = {
    REWARD: "Viewer Granary",
    CREATOR: "Creators & Scribes",
    OPS: "Garrison & Protocol Ops",
  }[category];

  return (
    <div className="parchment-card parchment-card-inner relative flex flex-col justify-between p-5 transition-shadow hover:shadow-md">
      {/* Corner Flourishes */}
      <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none">
        <CornerFlourish position="tl" size={18} />
      </div>
      <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
        <CornerFlourish position="tr" size={18} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CategoryBadge category={category} />
            <span className="font-serif text-sm font-bold text-[#1a1f12]">
              {categoryTitles}
            </span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-[#785918]">
            Cap: {formatMicro(perTxCap)}
          </span>
        </div>

        <p className="mt-2.5 font-serif text-xs italic text-[#6b6e5d] leading-relaxed">
          {description}
        </p>

        <div className="mt-5 rounded-md border border-[#e5e3d8] bg-[#fbfaf6] p-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-cinzel text-[11px] font-semibold uppercase tracking-wider text-[#6b6e5d]">
              Daily Granary Spend
            </span>
            <span className="font-mono text-xs font-bold text-[#1a1f12]">
              {formatMicro(spentInDay)}{" "}
              <span className="text-[#6b6e5d] font-normal">/ {formatMicro(dailyCap)}</span>
            </span>
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-[#d6d6c8] bg-[#e8e9dd]">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                percentUsed > 90
                  ? "bg-[#8c2a24]"
                  : percentUsed > 70
                  ? "bg-[#b08d3c]"
                  : "bg-[#4c5d34]"
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#d6d6c8] pt-3 text-xs">
        <span className="font-cinzel text-[11px] uppercase tracking-wider text-[#6b6e5d]">
          Remaining in Cap
        </span>
        <span className="font-mono font-bold text-[#2f3a20]">
          {formatMicro(remainingToday)}
        </span>
      </div>
    </div>
  );
}
