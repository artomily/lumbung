import React from "react";

export function RoyalSeal({
  className = "",
  size = 64,
  variant = "gold",
}: {
  className?: string;
  size?: number;
  variant?: "gold" | "ink" | "sage";
}) {
  const colors = {
    gold: {
      outer: "text-[#b08d3c]",
      inner: "fill-[#b08d3c]/10 stroke-[#b08d3c]",
      ink: "text-[#8c6b24]",
    },
    ink: {
      outer: "text-[#1a1f12]",
      inner: "fill-[#1a1f12]/5 stroke-current",
      ink: "text-[#1a1f12]",
    },
    sage: {
      outer: "text-[#4c5d34]",
      inner: "fill-[#93bd63]/15 stroke-[#4c5d34]",
      ink: "text-[#2f3a20]",
    },
  }[variant];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="Royal Treasury Seal"
    >
      {/* Scalloped / notched wax stamp outer edge */}
      <circle
        cx="50"
        cy="50"
        r="46"
        strokeWidth="1.2"
        className={colors.outer}
        stroke="currentColor"
        strokeDasharray="3 2"
      />
      <circle
        cx="50"
        cy="50"
        r="43"
        strokeWidth="1"
        className={colors.outer}
        stroke="currentColor"
      />

      {/* Beaded ring (32 dots) */}
      {Array.from({ length: 32 }).map((_, i) => {
        const angle = (i * 360 * Math.PI) / (32 * 180);
        const cx = 50 + 40 * Math.cos(angle);
        const cy = 50 + 40 * Math.sin(angle);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="0.8"
            className={colors.outer}
            fill="currentColor"
          />
        );
      })}

      {/* Inner double border */}
      <circle
        cx="50"
        cy="50"
        r="36"
        strokeWidth="0.8"
        className={colors.outer}
        stroke="currentColor"
      />
      <circle
        cx="50"
        cy="50"
        r="28"
        strokeWidth="1.2"
        className={colors.outer}
        stroke="currentColor"
        fill="currentColor"
        fillOpacity="0.04"
      />

      {/* Concentric heraldic emblem: ancient rice grain + royal crown + key */}
      <g stroke="currentColor" className={colors.outer} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        {/* Ancient Crown above */}
        <path d="M42 36 L44 42 L50 38 L56 42 L58 36 L58 44 L42 44 Z" fill="currentColor" fillOpacity="0.2" />
        <circle cx="42" cy="35" r="1" fill="currentColor" />
        <circle cx="50" cy="37" r="1" fill="currentColor" />
        <circle cx="58" cy="35" r="1" fill="currentColor" />

        {/* Central Rice Sheaf / Treasury Vault Key */}
        <line x1="50" y1="46" x2="50" y2="62" strokeWidth="1.5" />
        {/* Grain leaves sprouting from stem */}
        <path d="M50 49 Q45 47 44 43" />
        <path d="M50 49 Q55 47 56 43" />
        <path d="M50 53 Q44 52 43 48" />
        <path d="M50 53 Q56 52 57 48" />
        <path d="M50 57 Q45 56 44 53" />
        <path d="M50 57 Q55 56 56 53" />

        {/* Antique key bit at bottom of stem */}
        <path d="M50 62 C48 62 47 64 47 66 C47 68 48 70 50 70 C52 70 53 68 53 66 C53 64 52 62 50 62 Z" fill="none" />
        <circle cx="50" cy="66" r="1" fill="currentColor" />
      </g>

      {/* Archival Roman Numerals & Stars on collar */}
      <path
        d="M26 50 A 24 24 0 0 1 74 50"
        id="text-path-top"
        fill="none"
      />
      <text
        fontSize="5"
        fontFamily="Cinzel, serif"
        letterSpacing="0.18em"
        className={colors.outer}
        fill="currentColor"
        textAnchor="middle"
      >
        <textPath href="#text-path-top" startOffset="50%">
          TAMEION · LUMBUNG
        </textPath>
      </text>

      <path
        d="M74 50 A 24 24 0 0 1 26 50"
        id="text-path-bottom"
        fill="none"
      />
      <text
        fontSize="4.5"
        fontFamily="Cinzel, serif"
        letterSpacing="0.16em"
        className={colors.outer}
        fill="currentColor"
        textAnchor="middle"
      >
        <textPath href="#text-path-bottom" startOffset="50%">
          ★ REGAL TREASURY ★
        </textPath>
      </text>
    </svg>
  );
}
