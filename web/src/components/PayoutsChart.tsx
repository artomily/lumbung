"use client";

import React, { useState } from "react";
import { formatMicro, parseMicro } from "@/lib/money";
import { CornerFlourish } from "./ornaments/CornerFlourish";

export type DailyPayoutStat = {
  day: string;
  count: number;
  totalMicro: string;
};

export function PayoutsChart({ data }: { data: DailyPayoutStat[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="parchment-card parchment-card-inner p-10 text-center">
        <p className="font-serif text-base font-semibold text-[#1a1f12]">
          No daily payout activity recorded in the granary yet
        </p>
        <p className="mt-1 font-serif text-xs italic text-[#6b6e5d]">
          Confirmed viewer reward disbursements will appear here automatically.
        </p>
      </div>
    );
  }

  // Calculate scales
  const amounts = data.map((d) => Number(parseMicro(d.totalMicro)) / 1_000_000);
  const maxAmount = Math.max(...amounts, 5); // Minimum scale of $5

  const chartHeight = 220;
  const chartWidth = 700;
  const paddingX = 40;
  const paddingY = 30;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const barWidth = Math.min(usableWidth / data.length - 8, 36);

  return (
    <div className="parchment-card parchment-card-inner relative overflow-hidden p-6 sm:p-7">
      <div className="absolute top-2 left-2 z-10 pointer-events-none">
        <CornerFlourish position="tl" size={18} />
      </div>
      <div className="absolute top-2 right-2 z-10 pointer-events-none">
        <CornerFlourish position="tr" size={18} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h3 className="font-cinzel text-xs font-bold uppercase tracking-widest text-[#6b6e5d]">
            Daily Payout Volume (USDC on Arc)
          </h3>
          <p className="font-serif text-xs italic text-[#6b6e5d] mt-0.5">
            Confirmed viewer reward disbursements over the last {data.length} days
          </p>
        </div>

        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="flex items-center gap-3 rounded-md border border-[#d6d6c8] bg-[#fbfaf6] px-3 py-1 font-mono text-xs">
            <span className="font-cinzel text-[11px] font-bold text-[#1a1f12]">
              {data[hoveredIdx].day}:
            </span>
            <span className="text-[#4c5d34] font-bold">
              {formatMicro(parseMicro(data[hoveredIdx].totalMicro))}
            </span>
            <span className="text-[#6b6e5d] text-[11px]">
              ({data[hoveredIdx].count} payouts)
            </span>
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full min-w-[500px] overflow-visible"
        >
          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingY + usableHeight * (1 - ratio);
            const val = (maxAmount * ratio).toFixed(1);
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-[#d6d6c8]"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-[#6b6e5d] font-mono text-[10px]"
                >
                  ${val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, idx) => {
            const val = amounts[idx];
            const barHeight = Math.max((val / maxAmount) * usableHeight, 3);
            const x =
              paddingX +
              (idx * usableWidth) / data.length +
              (usableWidth / data.length - barWidth) / 2;
            const y = chartHeight - paddingY - barHeight;
            const isHovered = hoveredIdx === idx;

            // Short date label: "Oct 16"
            const dateParts = item.day.split("-");
            const shortLabel = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : item.day;

            return (
              <g
                key={item.day}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-all"
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={2}
                  className={`transition-colors duration-200 ${
                    isHovered
                      ? "fill-[#b08d3c]"
                      : "fill-[#4c5d34]"
                  }`}
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - paddingY + 16}
                  textAnchor="middle"
                  className="fill-[#6b6e5d] font-mono text-[10px]"
                >
                  {shortLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
