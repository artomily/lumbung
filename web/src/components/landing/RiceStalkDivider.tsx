import React from "react";

export function RiceStalkDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center gap-3 py-6 select-none pointer-events-none text-[#b08d3c] ${className}`}
      aria-hidden="true"
    >
      <div className="h-px flex-1 max-w-sm bg-gradient-to-r from-transparent via-[#b8b7a4] to-transparent" />
      <svg
        width="48"
        height="20"
        viewBox="0 0 48 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[#8c6b24] opacity-80"
      >
        {/* Left rice grain */}
        <path
          d="M16 10 C18 6 22 5 24 10 C22 15 18 14 16 10 Z"
          fill="currentColor"
          opacity="0.75"
        />
        {/* Center stalk stem */}
        <path
          d="M6 10 L42 10"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
        {/* Right rice grain */}
        <path
          d="M32 10 C30 6 26 5 24 10 C26 15 30 14 32 10 Z"
          fill="currentColor"
          opacity="0.75"
        />
        {/* Central diamond seed */}
        <polygon points="24,3 27,10 24,17 21,10" fill="#b08d3c" />
        <circle cx="8" cy="10" r="1.5" fill="#4c5d34" />
        <circle cx="40" cy="10" r="1.5" fill="#4c5d34" />
      </svg>
      <div className="h-px flex-1 max-w-sm bg-gradient-to-l from-transparent via-[#b8b7a4] to-transparent" />
    </div>
  );
}

export function RiceStalkBorder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-full overflow-hidden flex items-center justify-center opacity-40 py-1 ${className}`}
      aria-hidden="true"
    >
      <svg
        width="100%"
        height="12"
        viewBox="0 0 600 12"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[#8c6b24]"
      >
        <pattern
          id="rice-stalk-pattern"
          x="0"
          y="0"
          width="40"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 6 Q10 2 20 6 T40 6"
            stroke="currentColor"
            strokeWidth="0.8"
            fill="none"
          />
          <path
            d="M10 4 C12 2 15 2 16 5"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
          <path
            d="M30 8 C32 10 35 10 36 7"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </pattern>
        <rect width="600" height="12" fill="url(#rice-stalk-pattern)" />
      </svg>
    </div>
  );
}
