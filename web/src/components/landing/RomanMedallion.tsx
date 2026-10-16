import React from "react";

interface RomanMedallionProps {
  numeral: string;
  size?: "sm" | "md" | "lg";
  variant?: "gold" | "ink" | "sage";
  className?: string;
}

export function RomanMedallion({
  numeral,
  size = "md",
  variant = "gold",
  className = "",
}: RomanMedallionProps) {
  const sizeStyles = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  }[size];

  const variantStyles = {
    gold: "border-[#b08d3c]/70 text-[#8c6b24] bg-radial from-[#fffdf8] via-[#fbfaf6] to-[#f2ede2] shadow-[0_1px_3px_rgba(176,141,60,0.18)]",
    ink: "border-[#1a1f12]/60 text-[#1a1f12] bg-radial from-[#fbfaf6] to-[#e8e9dd] shadow-[0_1px_3px_rgba(26,31,18,0.12)]",
    sage: "border-[#4c5d34]/60 text-[#2f3a20] bg-radial from-[#fbfaf6] to-[#edf5e5] shadow-[0_1px_3px_rgba(76,93,52,0.15)]",
  }[variant];

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full border border-double ${sizeStyles} ${variantStyles} select-none shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* Inner hairline ring */}
      <div className="absolute inset-[2px] rounded-full border border-dashed border-current opacity-40 pointer-events-none" />
      <span className="font-cinzel font-bold tracking-wider leading-none relative z-10">
        {numeral}
      </span>
    </div>
  );
}
