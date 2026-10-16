"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RoyalSeal } from "../ornaments/RoyalSeal";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks: { href: string; roman: string; label: string }[] = [
    { href: "#economy", roman: "I", label: "OWatch Today" },
    { href: "#cycle", roman: "II", label: "Granary Cycle" },
    { href: "#transparency", roman: "III", label: "Transparency" },
    { href: "#telemetry", roman: "IV", label: "Telemetry" },
    { href: "#verify", roman: "V", label: "Verify" },
    { href: "#faq", roman: "VI", label: "FAQ" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#d6d6c8] bg-[#f5f3ea]/95 backdrop-blur-md">
      {/* Top Hairline Gold Accent Ribbon */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#b08d3c]/60 to-transparent" />

      <div className="page-container w-full px-4 sm:px-6 lg:px-10 xl:px-14 flex h-18 items-center justify-between">
        {/* Brand on the left */}
        <Link href="/" className="group flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#b08d3c]/50 bg-[#f2ede2] shadow-xs transition-transform group-hover:scale-105">
            <RoyalSeal size={28} variant="gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-bold tracking-tight text-[#1a1f12]">
                Lumbung
              </span>
              <span className="hidden rounded-sm border border-[#b08d3c]/40 bg-[#f6efe0] px-1.5 py-0.2 font-cinzel text-[10px] font-semibold uppercase tracking-wider text-[#8c6b24] sm:inline">
                Royal Treasury
              </span>
            </div>
            <p className="hidden min-[380px]:block font-serif text-xs text-[#6b6e5d] italic">
              OWatch Granary on Arc L1
            </p>
          </div>
        </Link>

        {/* Desktop Anchor Nav with Roman Numerals */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-3.5 2xl:gap-5 shrink-0">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group flex items-center gap-1.5 rounded-md px-2.5 xl:px-3 py-1.5 font-cinzel text-xs font-semibold uppercase tracking-wider text-[#6b6e5d] transition-all hover:border hover:border-[#e5e3d8] hover:bg-[#f2ede2] hover:text-[#1a1f12] whitespace-nowrap"
            >
              <span className="font-serif text-[11px] text-[#8c6b24] group-hover:text-[#b08d3c]">
                {link.roman}.
              </span>
              <span>{link.label}</span>
            </a>
          ))}
        </nav>

        {/* Right Action Area */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link
            href="/app"
            className="btn-royal-ink text-[11px] sm:text-xs py-1.5 px-2.5 sm:py-2 sm:px-4 font-cinzel font-bold tracking-wider inline-flex items-center gap-1 sm:gap-1.5 shadow-sm whitespace-nowrap"
          >
            <span>Enter</span>
            <span className="hidden sm:inline">App</span>
            <span aria-hidden="true">→</span>
          </Link>

          {/* Mobile Menu Button (Below 1024px / lg) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex lg:hidden items-center justify-center rounded-md border border-[#d6d6c8] bg-[#fbfaf6] p-1.5 sm:p-2 text-[#1a1f12] hover:bg-[#f2ede2] focus:outline-none transition-colors shrink-0"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Stacked Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#d6d6c8] bg-[#f5f3ea] px-4 py-3 sm:px-6 shadow-md">
          <nav className="flex flex-col gap-1.5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-md px-3.5 py-2 font-cinzel text-xs font-semibold uppercase tracking-wider text-[#6b6e5d] transition-colors hover:border hover:border-[#e5e3d8] hover:bg-[#f2ede2] hover:text-[#1a1f12]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-serif text-[#b08d3c] font-bold text-sm">
                    {link.roman}.
                  </span>
                  <span>{link.label}</span>
                </div>
              </a>
            ))}
            <div className="pt-2 border-t border-[#e5e3d8]">
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-royal-ink text-xs py-2 w-full text-center flex items-center justify-center gap-1.5"
              >
                <span>Open the App</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
