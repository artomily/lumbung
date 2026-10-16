import React from "react";

export function ConcentricRings({
  className = "",
  size = 640,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 600 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none text-[#1a1f12] ${className}`}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="0.8" opacity="0.25">
        {/* Outermost rim with fine tick marks */}
        <circle cx="300" cy="300" r="285" strokeWidth="0.6" strokeDasharray="3 4" />
        <circle cx="300" cy="300" r="275" strokeWidth="1" />
        <circle cx="300" cy="300" r="268" strokeWidth="0.5" />

        {/* Outer radial ticks (every 15 deg) */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15 * Math.PI) / 180;
          const x1 = 300 + 268 * Math.cos(angle);
          const y1 = 300 + 268 * Math.sin(angle);
          const x2 = 300 + 275 * Math.cos(angle);
          const y2 = 300 + 275 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={i % 2 === 0 ? "1" : "0.5"}
            />
          );
        })}

        {/* Secondary middle ring with 8 compass points */}
        <circle cx="300" cy="300" r="220" strokeWidth="0.8" />
        <circle cx="300" cy="300" r="214" strokeWidth="0.5" strokeDasharray="2 3" />

        {/* 8 diamond compass accents */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const cx = 300 + 217 * Math.cos(angle);
          const cy = 300 + 217 * Math.sin(angle);
          return (
            <polygon
              key={`dia-${i}`}
              points={`${cx},${cy - 3} ${cx + 3},${cy} ${cx},${cy + 3} ${cx - 3},${cy}`}
              fill="currentColor"
              stroke="none"
              opacity="0.8"
            />
          );
        })}

        {/* Inner concentric astronomical rings */}
        <circle cx="300" cy="300" r="160" strokeWidth="1.2" />
        <circle cx="300" cy="300" r="150" strokeWidth="0.5" />
        <circle cx="300" cy="300" r="110" strokeWidth="0.75" strokeDasharray="4 4" />
        <circle cx="300" cy="300" r="70" strokeWidth="1" />
        <circle cx="300" cy="300" r="64" strokeWidth="0.5" />

        {/* Radial cross-hairs */}
        <line x1="300" y1="20" x2="300" y2="120" strokeWidth="0.6" />
        <line x1="300" y1="480" x2="300" y2="580" strokeWidth="0.6" />
        <line x1="20" y1="300" x2="120" y2="300" strokeWidth="0.6" />
        <line x1="480" y1="300" x2="580" y2="300" strokeWidth="0.6" />

        {/* Center astrolabe star / sun rosette */}
        <circle cx="300" cy="300" r="16" strokeWidth="1" />
        <circle cx="300" cy="300" r="4" fill="currentColor" stroke="none" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 300 + 16 * Math.cos(angle);
          const y1 = 300 + 16 * Math.sin(angle);
          const x2 = 300 + 28 * Math.cos(angle);
          const y2 = 300 + 28 * Math.sin(angle);
          return <line key={`sun-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="0.8" />;
        })}
      </g>
    </svg>
  );
}
