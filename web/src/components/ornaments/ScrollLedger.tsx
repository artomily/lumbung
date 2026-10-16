import React from "react";

export function ScrollLedger({
  className = "",
  size = 48,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-[#1a1f12] ${className}`}
      aria-label="Royal ledger and scroll engraving"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* Parchment scroll body */}
        <path
          d="M12 14 C12 11 15 10 18 10 L48 10 C51 10 54 11 54 14 L54 50 C54 53 51 54 48 54 L18 54 C15 54 12 53 12 50 Z"
          strokeWidth="1.2"
          fill="#fbfaf6"
        />

        {/* Rolled parchment top & bottom curves */}
        <path d="M12 14 C12 17 15 18 18 18 L54 18" strokeWidth="0.8" />
        <path d="M12 14 C12 11 15 10 18 10 C21 10 24 12 24 15 C24 17 21 18 18 18" strokeWidth="1" />
        <path d="M18 54 C15 54 12 52 12 50 C12 47 15 46 18 46 L50 46" strokeWidth="0.8" />
        <path d="M48 54 C51 54 54 52 54 50 C54 47 51 46 48 46" strokeWidth="1" />

        {/* Ledger entry ruled lines */}
        <line x1="20" y1="24" x2="46" y2="24" strokeWidth="0.75" />
        <line x1="20" y1="29" x2="42" y2="29" strokeWidth="0.75" strokeDasharray="3 2" />
        <line x1="20" y1="34" x2="46" y2="34" strokeWidth="0.75" />
        <line x1="20" y1="39" x2="38" y2="39" strokeWidth="0.75" strokeDasharray="3 2" />

        {/* Hanging ribbon bookmark with wax seal dot */}
        <path d="M32 10 L32 20 L35 17 L38 20 L38 10" strokeWidth="0.8" fill="#b08d3c" fillOpacity="0.4" />
        <circle cx="35" cy="22" r="2" fill="#b08d3c" strokeWidth="0.6" stroke="#8c6b24" />

        {/* Antique Feather Quill Pen leaning across ledger */}
        <path
          d="M52 8 C48 16 42 26 36 38 L34 44 L37 42 C44 32 50 20 54 10 C55 8 54 7 52 8 Z"
          strokeWidth="1"
          fill="#f5f3ea"
        />
        {/* Quill spine */}
        <line x1="53" y1="9" x2="35" y2="43" strokeWidth="0.75" />
        {/* Quill nib */}
        <polygon points="34,44 32,47 35,45" fill="currentColor" stroke="none" />
        <line x1="33" y1="46" x2="35" y2="44" strokeWidth="0.6" stroke="currentColor" />
      </g>
    </svg>
  );
}
