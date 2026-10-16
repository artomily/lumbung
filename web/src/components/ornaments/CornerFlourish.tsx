import React from "react";

export function CornerFlourish({
  position = "tl",
  size = 24,
  className = "",
}: {
  position?: "tl" | "tr" | "bl" | "br";
  size?: number;
  className?: string;
}) {
  const transforms = {
    tl: "",
    tr: "scale(-1, 1)",
    bl: "scale(1, -1)",
    br: "scale(-1, -1)",
  }[position];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none text-[#b08d3c]/70 ${className}`}
      aria-hidden="true"
      style={{ transform: transforms, transformOrigin: "center" }}
    >
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer corner angle */}
        <path d="M2 18 L2 2 L18 2" strokeWidth="1.2" />
        {/* Inner corner hairline */}
        <path d="M5 14 L5 5 L14 5" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
        {/* Curled leaf / fleuron motif */}
        <path d="M5 5 C8 8 11 11 15 15 C12 17 9 15 7 13" strokeWidth="0.8" />
        <path d="M15 15 C17 12 15 9 13 7" strokeWidth="0.8" />
        {/* Corner accent dot */}
        <circle cx="2" cy="2" r="1.2" fill="currentColor" />
        <circle cx="8" cy="8" r="0.8" fill="currentColor" />
      </g>
    </svg>
  );
}

export function DividerFlourish({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center gap-3 py-2 text-[#d6d6c8] ${className}`} aria-hidden="true">
      <div className="h-px flex-1 max-w-xs bg-gradient-to-r from-transparent via-[#b8b7a4] to-transparent" />
      <svg width="24" height="12" viewBox="0 0 24 12" fill="none" className="text-[#b08d3c]">
        <path d="M12 0 L15 6 L12 12 L9 6 Z" fill="currentColor" />
        <circle cx="4" cy="6" r="1.5" fill="currentColor" opacity="0.6" />
        <circle cx="20" cy="6" r="1.5" fill="currentColor" opacity="0.6" />
      </svg>
      <div className="h-px flex-1 max-w-xs bg-gradient-to-l from-transparent via-[#b8b7a4] to-transparent" />
    </div>
  );
}
