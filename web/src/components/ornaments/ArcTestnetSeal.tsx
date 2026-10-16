import React from "react";

export function ArcTestnetSeal({
  className = "",
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" />
      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="0.8" />
      {/* 8 small peripheral dots */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const cx = 16 + 13.2 * Math.cos(angle);
        const cy = 16 + 13.2 * Math.sin(angle);
        return <circle key={i} cx={cx} cy={cy} r="0.6" fill="currentColor" />;
      })}
      {/* Inner Astrolabe Arc Star */}
      <path
        d="M16 8 L17.5 13.5 L23 14 L18.5 17.5 L20 23 L16 19.5 L12 23 L13.5 17.5 L9 14 L14.5 13.5 Z"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}
