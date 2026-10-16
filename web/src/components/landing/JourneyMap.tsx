import React from "react";
import Image from "next/image";
import { RomanMedallion } from "./RomanMedallion";

interface JourneyStep {
  step: number;
  roman: string;
  title: string;
  caption: string;
  imageSrc: string;
  width: number;
  height: number;
}

export function JourneyMap() {
  const steps: JourneyStep[] = [
    {
      step: 1,
      roman: "I",
      title: "Harvest Vault Deposit",
      caption: "OWatch seeds the granary with USDC reserves into contract envelopes.",
      imageSrc: "/illustrations/vignette-deposit.webp",
      width: 442,
      height: 531,
    },
    {
      step: 2,
      roman: "II",
      title: "Viewers Earn Points",
      caption: "Audiences watch videos and earn loyalty points backed by the vault.",
      imageSrc: "/illustrations/vignette-viewer.webp",
      width: 435,
      height: 428,
    },
    {
      step: 3,
      roman: "III",
      title: "Redemption Requested",
      caption: "Viewers cash out points via an HMAC-signed webhook with unique ID.",
      imageSrc: "/illustrations/vignette-exchange.webp",
      width: 508,
      height: 410,
    },
    {
      step: 4,
      roman: "IV",
      title: "AI Keeper Evaluates",
      caption: "Deterministic rules and LLM verify solvency, caps, and reasonHash.",
      imageSrc: "/illustrations/vignette-keeper.webp",
      width: 496,
      height: 425,
    },
    {
      step: 5,
      roman: "V",
      title: "Instant Arc Settlement",
      caption: "Circle smart contract account calls LumbungVault with 1s finality.",
      imageSrc: "/illustrations/vignette-messenger.webp",
      width: 512,
      height: 458,
    },
    {
      step: 6,
      roman: "VI",
      title: "Cryptographic Proof",
      caption: "Public Arc receipt verified and reasonHash recomputed in browser.",
      imageSrc: "/illustrations/vignette-verify.webp",
      width: 503,
      height: 384,
    },
  ];

  return (
    <div className="relative w-full">
      {/* ======================================================== */}
      {/* DESKTOP / TABLET VIEW (Zig-zag / 3-column Journey Flow)   */}
      {/* ======================================================== */}
      <div className="hidden md:block relative">
        {/* Subtle decorative background dashed connecting path */}
        <div className="grid grid-cols-3 gap-6 lg:gap-8 relative z-10">
          {steps.map((s, idx) => (
            <div
              key={s.step}
              className="group parchment-card parchment-card-inner p-5 lg:p-6 flex flex-col items-center text-center justify-between transition-all duration-300 hover:border-[#b08d3c]/80 hover:shadow-lg relative bg-[#fbfaf6]"
            >
              {/* Connector indicators for desktop flow */}
              {idx === 0 && (
                <div className="hidden lg:block absolute -right-5 top-1/2 -translate-y-1/2 z-20 text-[#b08d3c]/60 pointer-events-none">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 12 H19 M14 7 L19 12 L14 17" strokeDasharray="2 2" />
                  </svg>
                </div>
              )}
              {idx === 1 && (
                <div className="hidden lg:block absolute -right-5 top-1/2 -translate-y-1/2 z-20 text-[#b08d3c]/60 pointer-events-none">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 12 H19 M14 7 L19 12 L14 17" strokeDasharray="2 2" />
                  </svg>
                </div>
              )}
              {idx === 3 && (
                <div className="hidden lg:block absolute -right-5 top-1/2 -translate-y-1/2 z-20 text-[#b08d3c]/60 pointer-events-none">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 12 H19 M14 7 L19 12 L14 17" strokeDasharray="2 2" />
                  </svg>
                </div>
              )}
              {idx === 4 && (
                <div className="hidden lg:block absolute -right-5 top-1/2 -translate-y-1/2 z-20 text-[#b08d3c]/60 pointer-events-none">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 12 H19 M14 7 L19 12 L14 17" strokeDasharray="2 2" />
                  </svg>
                </div>
              )}

              {/* Medallion Header */}
              <div className="flex items-center gap-2 mb-3">
                <RomanMedallion numeral={s.roman} size="sm" variant="gold" />
                <span className="font-cinzel text-[11px] font-bold tracking-wider text-[#8c6b24] uppercase">
                  Stage {s.step}
                </span>
              </div>

              {/* Large Pen-and-Ink Engraved Illustration */}
              <div className="relative w-full max-w-[260px] aspect-4/3 flex items-center justify-center my-2 overflow-hidden bg-[#fbfaf6]">
                <Image
                  src={s.imageSrc}
                  alt=""
                  width={s.width}
                  height={s.height}
                  loading="lazy"
                  className="w-full h-full object-contain mix-blend-multiply select-none pointer-events-none transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Text Meta: 2-4 word title + 1 line caption */}
              <div className="mt-3 space-y-1 w-full">
                <h3 className="font-serif text-base lg:text-lg font-bold text-[#1a1f12] tracking-tight">
                  {s.title}
                </h3>
                <p className="font-serif text-xs text-[#3c4132] leading-snug max-w-xs mx-auto">
                  {s.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOBILE VIEW (Vertical Timeline with Dashed Ink Path)    */}
      {/* ======================================================== */}
      <div className="md:hidden relative pl-6 space-y-6">
        {/* Dashed vertical ink path running down the left */}
        <div className="absolute left-[13px] top-4 bottom-4 w-px border-l-2 border-dashed border-[#b08d3c]/50" />

        {steps.map((s) => (
          <div key={s.step} className="relative parchment-card parchment-card-inner p-4 space-y-3 bg-[#fbfaf6]">
            {/* Timeline node marker */}
            <div className="absolute -left-[27px] top-4 z-20">
              <RomanMedallion numeral={s.roman} size="sm" variant="gold" />
            </div>

            <div className="flex items-center justify-between">
              <span className="font-cinzel text-[10px] font-bold text-[#8c6b24] tracking-wider uppercase">
                Stage {s.step}
              </span>
              <h3 className="font-serif text-base font-bold text-[#1a1f12]">
                {s.title}
              </h3>
            </div>

            {/* Large illustration */}
            <div className="relative w-full max-w-[220px] aspect-4/3 mx-auto flex items-center justify-center bg-[#fbfaf6]">
              <Image
                src={s.imageSrc}
                alt=""
                width={s.width}
                height={s.height}
                loading="lazy"
                className="w-full h-full object-contain mix-blend-multiply select-none pointer-events-none"
              />
            </div>

            <p className="font-serif text-xs text-[#3c4132] leading-snug text-center">
              {s.caption}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
