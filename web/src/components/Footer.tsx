import React from "react";
import Link from "next/link";
import { ArcTestnetSeal } from "./ornaments/ArcTestnetSeal";
import { RoyalSeal } from "./ornaments/RoyalSeal";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#d6d6c8] bg-[#f2ede2]/70 py-10 text-xs text-[#6b6e5d]">
      <div className="page-container w-full px-4 sm:px-6 lg:px-10 xl:px-14 flex flex-col items-center justify-between gap-6 sm:flex-row">
        <Link href="/app" className="group flex items-center gap-3 transition-opacity hover:opacity-85">
          <RoyalSeal size={24} variant="gold" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-serif font-bold text-[#1a1f12]">
              Lumbung
            </span>
            <span className="hidden sm:inline text-[#b08d3c]">·</span>
            <span className="font-serif italic">
              AI Treasury Keeper of OWatch on Arc (Circle L1)
            </span>
          </div>
        </Link>

        {/* Internal Pages Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 font-cinzel text-[11px] tracking-wider text-[#6b6e5d]">
          <Link href="/" className="hover:text-[#1a1f12] transition-colors">
            Landing
          </Link>
          <span className="text-[#d6d6c8]">·</span>
          <Link href="/app" className="hover:text-[#1a1f12] transition-colors">
            I. Granary
          </Link>
          <span className="text-[#d6d6c8]">·</span>
          <Link href="/app/decisions" className="hover:text-[#1a1f12] transition-colors">
            II. Chronicle
          </Link>
          <span className="text-[#d6d6c8]">·</span>
          <Link href="/app/approvals" className="hover:text-[#1a1f12] transition-colors">
            III. Approvals
          </Link>
          <span className="text-[#d6d6c8]">·</span>
          <Link href="/app/metrics" className="hover:text-[#1a1f12] transition-colors">
            IV. Records
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 font-cinzel text-[11px] tracking-wider text-[#6b6e5d]">
          <a
            href="https://explorer.testnet.arc.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-[#1a1f12] transition-colors"
          >
            <ArcTestnetSeal size={12} className="text-[#b08d3c]" />
            <span>Arc Explorer</span>
          </a>
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#1a1f12] transition-colors"
          >
            Circle Faucet
          </a>
          <span className="text-[#b8b7a4]">|</span>
          <span className="text-[#3c4132]">
            Tameion Agents Hackathon (Canteen × Circle)
          </span>
        </div>
      </div>
      <div className="page-container w-full px-4 sm:px-6 lg:px-10 xl:px-14 mt-4 text-center text-[10px] font-mono text-[#6b6e5d]">
        ANNO MMXXVI · DECISION LEDGER APPEND-ONLY · KECCAK256 REASONHASH ON-CHAIN
      </div>
    </footer>
  );
}
