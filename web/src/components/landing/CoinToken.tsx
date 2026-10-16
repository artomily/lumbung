import React from "react";

interface CoinTokenProps {
  label: string;
  value: string;
  subtitle: string;
  variant?: "gold" | "sage" | "ink";
  className?: string;
}

export function CoinToken({
  label,
  value,
  subtitle,
  variant = "gold",
  className = "",
}: CoinTokenProps) {
  const borderRingColor = {
    gold: "border-[#b08d3c]/60 group-hover:border-[#b08d3c]",
    sage: "border-[#4c5d34]/60 group-hover:border-[#4c5d34]",
    ink: "border-[#1a1f12]/40 group-hover:border-[#1a1f12]/80",
  }[variant];

  const valueColor = {
    gold: "text-[#1a1f12]",
    sage: "text-[#2f3a20]",
    ink: "text-[#1a1f12]",
  }[variant];

  return (
    <div
      className={`group relative flex flex-col items-center justify-center text-center rounded-full aspect-square w-full max-w-[220px] mx-auto p-4 sm:p-5 transition-all duration-300 hover:scale-[1.03] shadow-[0_4px_12px_rgba(26,31,18,0.06)] bg-gradient-to-b from-[#fdfbf7] via-[#f7f2e7] to-[#eee6d4] ${className}`}
    >
      {/* Outer coin rim - double ring */}
      <div
        className={`absolute inset-0 rounded-full border-2 border-double pointer-events-none transition-colors duration-300 ${borderRingColor}`}
      />
      {/* Middle beaded ring */}
      <div className="absolute inset-[4px] sm:inset-[6px] rounded-full border border-dashed border-[#b8b7a4]/60 pointer-events-none" />
      {/* Inner hairline glow ring */}
      <div className="absolute inset-[8px] sm:inset-[10px] rounded-full border border-[#e5e3d8] pointer-events-none" />

      {/* Content inside coin */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-1 sm:gap-1.5 w-full px-2">
        {/* Coin top label */}
        <span className="font-cinzel text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-[#8c6b24] line-clamp-1">
          {label}
        </span>

        {/* Center Serif Numeral */}
        <span
          className={`font-serif text-lg sm:text-xl lg:text-2xl font-bold tracking-tight leading-tight ${valueColor}`}
        >
          {value}
        </span>

        {/* Bottom subtitle / unit */}
        <span className="font-serif text-[10px] sm:text-[11px] text-[#6b6e5d] italic line-clamp-1">
          {subtitle}
        </span>
      </div>
    </div>
  );
}
