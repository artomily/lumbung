import React from "react";

export function LumbungBarn({
  className = "",
  size = 180,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-[#1a1f12] ${className}`}
      aria-label="Javanese rice barn (lumbung) engraving"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* Ground plinth line and stone footings */}
        <line x1="25" y1="180" x2="175" y2="180" strokeWidth="1.2" />
        <line x1="15" y1="184" x2="185" y2="184" strokeWidth="0.6" strokeDasharray="2 3" />

        {/* Foundation stones (umpak) */}
        <path d="M42 180 L46 173 L62 173 L66 180 Z" strokeWidth="1" />
        <path d="M134 180 L138 173 L154 173 L158 180 Z" strokeWidth="1" />

        {/* Four Sturdy Wooden Stilts (tiang penyangga) */}
        {/* Left Outer Pillar */}
        <line x1="50" y1="173" x2="50" y2="118" strokeWidth="1.8" />
        {/* Left Inner Pillar */}
        <line x1="58" y1="173" x2="58" y2="118" strokeWidth="1.4" />
        {/* Right Inner Pillar */}
        <line x1="142" y1="173" x2="142" y2="118" strokeWidth="1.4" />
        {/* Right Outer Pillar */}
        <line x1="150" y1="173" x2="150" y2="118" strokeWidth="1.8" />

        {/* Cross bracings between pillars */}
        <line x1="58" y1="160" x2="142" y2="135" strokeWidth="0.7" opacity="0.6" />
        <line x1="58" y1="135" x2="142" y2="160" strokeWidth="0.7" opacity="0.6" />

        {/* Circular wooden anti-rodent baffles (lingkar penahan hama) */}
        <ellipse cx="54" cy="132" rx="10" ry="3.5" strokeWidth="1" fill="#f5f3ea" />
        <ellipse cx="146" cy="132" rx="10" ry="3.5" strokeWidth="1" fill="#f5f3ea" />

        {/* Elevated Timber Platform / Subfloor */}
        <rect x="36" y="112" width="128" height="6" strokeWidth="1.4" fill="#f5f3ea" />
        <line x1="36" y1="115" x2="164" y2="115" strokeWidth="0.5" />

        {/* Granary Body / Woven Bamboo Walls (Gedek) */}
        <path
          d="M45 112 L48 68 L152 68 L155 112 Z"
          strokeWidth="1.5"
          fill="#fbfaf6"
        />

        {/* Woven pattern lines inside walls */}
        <line x1="52" y1="78" x2="148" y2="78" strokeWidth="0.6" strokeDasharray="3 2" />
        <line x1="50" y1="88" x2="150" y2="88" strokeWidth="0.6" strokeDasharray="3 2" />
        <line x1="48" y1="98" x2="152" y2="98" strokeWidth="0.6" strokeDasharray="3 2" />
        <line x1="46" y1="106" x2="154" y2="106" strokeWidth="0.6" strokeDasharray="3 2" />

        {/* Vertical wall divisions */}
        <line x1="82" y1="68" x2="80" y2="112" strokeWidth="0.8" />
        <line x1="118" y1="68" x2="120" y2="112" strokeWidth="0.8" />

        {/* Central Wooden Granary Hatch / Door */}
        <rect x="88" y="76" width="24" height="32" strokeWidth="1" />
        <line x1="100" y1="76" x2="100" y2="108" strokeWidth="0.7" />
        <circle cx="97" cy="94" r="1" fill="currentColor" />
        <circle cx="103" cy="94" r="1" fill="currentColor" />

        {/* Wooden Grain Ladder */}
        <line x1="104" y1="114" x2="118" y2="180" strokeWidth="1.2" />
        <line x1="112" y1="114" x2="126" y2="180" strokeWidth="1.2" />
        <line x1="106" y1="126" x2="114" y2="126" strokeWidth="1" />
        <line x1="109" y1="140" x2="117" y2="140" strokeWidth="1" />
        <line x1="112" y1="154" x2="120" y2="154" strokeWidth="1" />
        <line x1="115" y1="168" x2="123" y2="168" strokeWidth="1" />

        {/* Majestic Curved Thatched Roof (Atap Lumbung - iconic high curve) */}
        {/* Main roof silhouette */}
        <path
          d="M16 72 Q40 66 70 30 Q100 16 100 16 Q100 16 130 30 Q160 66 184 72 Q156 64 100 64 Q44 64 16 72 Z"
          strokeWidth="1.6"
          fill="#f5f3ea"
        />

        {/* Secondary eave overhang */}
        <path
          d="M22 68 Q54 62 100 62 Q146 62 178 68"
          strokeWidth="0.8"
        />

        {/* Roof ridge beam (bubungan) and crown ornament (wuwungan) */}
        <path d="M78 28 Q100 14 122 28" strokeWidth="1.5" />
        {/* Crown finial */}
        <path d="M100 16 L100 6" strokeWidth="1.4" />
        <circle cx="100" cy="5" r="2.5" strokeWidth="1" fill="currentColor" />
        <path d="M96 11 Q100 8 104 11" strokeWidth="1" />

        {/* Etching thatch texture lines on roof */}
        <path d="M50 56 Q75 36 90 24" strokeWidth="0.5" opacity="0.7" />
        <path d="M64 58 Q85 40 96 22" strokeWidth="0.5" opacity="0.7" />
        <path d="M150 56 Q125 36 110 24" strokeWidth="0.5" opacity="0.7" />
        <path d="M136 58 Q115 40 104 22" strokeWidth="0.5" opacity="0.7" />

        {/* Flanking sheaves of ripe rice (batang padi) */}
        {/* Left grain bundle */}
        <path d="M24 175 Q20 150 14 135" strokeWidth="1" stroke="currentColor" />
        <path d="M26 175 Q24 145 20 130" strokeWidth="1" stroke="currentColor" />
        <circle cx="13" cy="133" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="16" cy="138" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="19" cy="128" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="22" cy="134" r="1.5" fill="currentColor" stroke="none" />

        {/* Right grain bundle */}
        <path d="M176 175 Q180 150 186 135" strokeWidth="1" stroke="currentColor" />
        <path d="M174 175 Q176 145 180 130" strokeWidth="1" stroke="currentColor" />
        <circle cx="187" cy="133" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="184" cy="138" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="181" cy="128" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="178" cy="134" r="1.5" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
