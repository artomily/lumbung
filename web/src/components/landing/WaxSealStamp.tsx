import React from "react";

interface WaxSealStampProps {
  className?: string;
  size?: number;
  rotation?: number;
}

export function WaxSealStamp({
  className = "",
  size = 120,
  rotation = -8,
}: WaxSealStampProps) {
  return (
    <div
      className={`inline-block select-none pointer-events-none transition-transform hover:scale-105 ${className}`}
      style={{
        transform: `rotate(${rotation}deg)`,
      }}
      aria-label="Verified on Arc seal"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_4px_12px_rgba(139,34,34,0.22)]"
        role="img"
      >
        <defs>
          {/* Circular path for upper text */}
          <path
            id="wax-arc-text-path-top"
            d="M 28 80 A 52 52 0 0 1 132 80"
            fill="none"
          />
          {/* Circular path for bottom text */}
          <path
            id="wax-arc-text-path-bottom"
            d="M 132 80 A 52 52 0 0 1 28 80"
            fill="none"
          />
          <radialGradient
            id="wax-gradient"
            cx="45%"
            cy="40%"
            r="60%"
            fx="40%"
            fy="35%"
          >
            <stop offset="0%" stopColor="#9e2a2b" />
            <stop offset="65%" stopColor="#7a1f20" />
            <stop offset="100%" stopColor="#581516" />
          </radialGradient>
        </defs>

        {/* Scalloped outer wax blob / seal border */}
        <path
          d="M80 8 
             C92 7 99 15 110 17 
             C121 19 131 16 139 24 
             C147 32 144 42 149 53 
             C154 64 153 71 152 80 
             C151 89 154 96 149 107 
             C144 118 147 128 139 136 
             C131 144 121 141 110 143 
             C99 145 92 153 80 152 
             C68 153 61 145 50 143 
             C39 141 29 144 21 136 
             C13 128 16 118 11 107 
             C6 96 9 89 8 80 
             C9 71 6 64 11 53 
             C16 42 13 32 21 24 
             C29 16 39 19 50 17 
             C61 15 68 7 80 8 Z"
          fill="url(#wax-gradient)"
          stroke="#420d0e"
          strokeWidth="1.5"
        />

        {/* Outer embossed ring */}
        <circle
          cx="80"
          cy="80"
          r="66"
          stroke="#e07a5f"
          strokeWidth="1"
          strokeOpacity="0.4"
          fill="none"
        />
        <circle
          cx="80"
          cy="80"
          r="62"
          stroke="#3d0a0b"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Inner beaded ring */}
        <circle
          cx="80"
          cy="80"
          r="54"
          stroke="#f2ede2"
          strokeWidth="1"
          strokeDasharray="2 3"
          strokeOpacity="0.6"
          fill="none"
        />

        {/* Circular embossed text top: VERIFIED ON ARC */}
        <text
          fill="#fbfaf6"
          fontSize="10"
          fontFamily="var(--font-cinzel), Georgia, serif"
          fontWeight="bold"
          letterSpacing="0.18em"
          opacity="0.95"
        >
          <textPath
            href="#wax-arc-text-path-top"
            startOffset="50%"
            textAnchor="middle"
          >
            ★ VERIFIED ON ARC ★
          </textPath>
        </text>

        {/* Circular embossed text bottom: SOLVENCY ASSURED */}
        <text
          fill="#fbfaf6"
          fontSize="8.5"
          fontFamily="var(--font-cinzel), Georgia, serif"
          fontWeight="bold"
          letterSpacing="0.16em"
          opacity="0.85"
        >
          <textPath
            href="#wax-arc-text-path-bottom"
            startOffset="50%"
            textAnchor="middle"
          >
            • SOLVENCY ASSURED •
          </textPath>
        </text>

        {/* Center seal emblem */}
        <g transform="translate(80, 80)">
          {/* Inner medallion circle */}
          <circle
            cx="0"
            cy="0"
            r="30"
            fill="#641617"
            stroke="#f2ede2"
            strokeWidth="0.8"
            strokeOpacity="0.5"
          />

          {/* Diamond star motif */}
          <path
            d="M 0 -18 L 4 -4 L 18 0 L 4 4 L 0 18 L -4 4 L -18 0 L -4 -4 Z"
            fill="#f6efe0"
            opacity="0.9"
          />
          {/* Center core */}
          <circle cx="0" cy="0" r="3.5" fill="#9e2a2b" stroke="#f6efe0" strokeWidth="0.8" />

          {/* Corner accent dots */}
          <circle cx="-10" cy="-10" r="1.2" fill="#f6efe0" opacity="0.7" />
          <circle cx="10" cy="-10" r="1.2" fill="#f6efe0" opacity="0.7" />
          <circle cx="-10" cy="10" r="1.2" fill="#f6efe0" opacity="0.7" />
          <circle cx="10" cy="10" r="1.2" fill="#f6efe0" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
}
