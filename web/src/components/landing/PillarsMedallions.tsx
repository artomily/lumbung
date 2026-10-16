import React from "react";

interface PillarItem {
  id: string;
  numeral: string;
  title: string;
  tagline: string;
  icon: React.ReactNode;
}

export function PillarsMedallions() {
  const pillars: PillarItem[] = [
    {
      id: "solvency",
      numeral: "01",
      title: "Live Solvency",
      tagline:
        "Public vault balance continuously matched against outstanding viewer loyalty points.",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Balance Scale */}
          <line x1="16" y1="4" x2="16" y2="28" />
          <line x1="10" y1="28" x2="22" y2="28" />
          <line x1="6" y1="9" x2="26" y2="9" />
          <circle cx="16" cy="9" r="1.5" fill="currentColor" />
          {/* Left Pan */}
          <line x1="6" y1="9" x2="3" y2="17" />
          <line x1="6" y1="9" x2="9" y2="17" />
          <path d="M2 17 Q6 21 10 17 Z" fill="currentColor" fillOpacity="0.15" />
          {/* Right Pan */}
          <line x1="26" y1="9" x2="23" y2="17" />
          <line x1="26" y1="9" x2="29" y2="17" />
          <path d="M22 17 Q26 21 30 17 Z" fill="currentColor" fillOpacity="0.15" />
        </svg>
      ),
    },
    {
      id: "contract",
      numeral: "02",
      title: "On-Chain Envelopes",
      tagline:
        "Strict budget caps carved into LumbungVault.sol that no AI agent can exceed.",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Contract / Seal */}
          <rect x="6" y="4" width="20" height="24" rx="2" fill="currentColor" fillOpacity="0.08" />
          <line x1="10" y1="9" x2="22" y2="9" />
          <line x1="10" y1="13" x2="22" y2="13" />
          <line x1="10" y1="17" x2="16" y2="17" />
          {/* Wax seal at bottom right */}
          <circle cx="21" cy="22" r="5" fill="#b08d3c" fillOpacity="0.25" stroke="#b08d3c" strokeWidth="1.5" />
          <path d="M19.5 22 L22.5 22" stroke="#b08d3c" />
          <path d="M21 20.5 L21 23.5" stroke="#b08d3c" />
        </svg>
      ),
    },
    {
      id: "append-only",
      numeral: "03",
      title: "Append-Only Ledger",
      tagline:
        "Decisions and events can never be altered or deleted, guaranteed by database triggers.",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Chained Book */}
          <path d="M5 6 C5 5 6 4 7 4 L26 4 C27 4 28 5 28 6 L28 26 C28 27 27 28 26 28 L7 28 C6 28 5 27 5 26 Z" fill="currentColor" fillOpacity="0.08" />
          <path d="M8 4 L8 28" />
          {/* Chain links */}
          <rect x="13" y="11" width="10" height="10" rx="2" strokeWidth="1.2" />
          <path d="M16 11 L16 8 C16 6.5 20 6.5 20 8 L20 11" strokeWidth="1.2" />
          <circle cx="18" cy="16" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: "hash-proofs",
      numeral: "04",
      title: "Browser Hash Proofs",
      tagline:
        "Every payout commits keccak256(canonicalJson) to Arc, verifiable client-side.",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Magnifier over hash lines */}
          <line x1="5" y1="8" x2="14" y2="8" strokeDasharray="1.5 1.5" />
          <line x1="5" y1="13" x2="11" y2="13" strokeDasharray="1.5 1.5" />
          <line x1="5" y1="18" x2="9" y2="18" strokeDasharray="1.5 1.5" />
          <circle cx="18" cy="14" r="8" fill="currentColor" fillOpacity="0.1" strokeWidth="1.5" />
          <line x1="24" y1="20" x2="29" y2="26" strokeWidth="2" />
          {/* Hash symbol inside lens */}
          <path d="M16 11 L16 17 M20 11 L20 17 M14 13 L22 13 M14 15 L22 15" strokeWidth="1" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
      {pillars.map((pillar) => (
        <div
          key={pillar.id}
          className="parchment-card parchment-card-inner p-5 sm:p-6 transition-all duration-200 hover:border-[#b08d3c]/70 hover:shadow-md flex flex-col justify-between gap-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Icon medallion */}
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#b08d3c]/50 bg-radial from-[#fffdf8] to-[#f6efe0] text-[#8c6b24] shadow-xs shrink-0">
                <div className="absolute inset-[2px] rounded-full border border-dashed border-[#b08d3c]/30 pointer-events-none" />
                {pillar.icon}
              </div>
              <div>
                <span className="font-cinzel text-[10px] font-bold text-[#8c6b24] tracking-widest uppercase">
                  Pillar {pillar.numeral}
                </span>
                <h3 className="font-serif text-base sm:text-lg font-bold text-[#1a1f12] tracking-tight">
                  {pillar.title}
                </h3>
              </div>
            </div>
          </div>
          <p className="font-serif text-xs sm:text-sm text-[#3c4132] leading-relaxed">
            {pillar.tagline}
          </p>
        </div>
      ))}
    </div>
  );
}
