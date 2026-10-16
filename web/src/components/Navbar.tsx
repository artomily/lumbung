"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { ArcTestnetSeal } from "./ornaments/ArcTestnetSeal";
import { RoyalSeal } from "./ornaments/RoyalSeal";

export function Navbar({
  vaultAddress,
  explorerUrl = "https://explorer.testnet.arc.io",
}: {
  vaultAddress?: string | null;
  explorerUrl?: string;
}) {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks: { href: string; roman?: string; label: string }[] = [
    { href: "/", label: "Landing" },
    { href: "/app", roman: "I", label: "Royal Granary" },
    { href: "/app/decisions", roman: "II", label: "Chronicle of Decisions" },
    { href: "/app/approvals", roman: "III", label: "Royal Seal" },
    { href: "/app/metrics", roman: "IV", label: "Treasury Records" },
  ];

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#d6d6c8] bg-[#f5f3ea]/95 backdrop-blur-md">
      {/* Top Hairline Gold Accent Ribbon */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#b08d3c]/60 to-transparent" />

      <div className="page-container w-full px-4 sm:px-6 lg:px-10 xl:px-14 flex h-18 items-center justify-between">
        {/* Brand on the left */}
        <Link href="/app" className="group flex items-center gap-2.5 sm:gap-3 shrink-0">
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
            <p className="font-serif text-xs text-[#6b6e5d] italic">
              OWatch Granary on Arc L1
            </p>
          </div>
        </Link>

        {/* Desktop Nav with Roman Numerals (Shown at lg and wider, strictly single line) */}
        <nav className="hidden lg:flex items-center gap-2 xl:gap-5 2xl:gap-7 shrink-0">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : link.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative flex items-center gap-1.5 rounded-md px-2.5 xl:px-3 py-1.5 font-cinzel text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all ${
                  isActive
                    ? "border border-[#d6d6c8] bg-[#fbfaf6] text-[#1a1f12] shadow-2xs"
                    : "text-[#6b6e5d] hover:border hover:border-[#e5e3d8] hover:bg-[#f2ede2] hover:text-[#1a1f12]"
                }`}
              >
                {link.roman && (
                  <span
                    className={`font-serif text-[11px] ${
                      isActive
                        ? "text-[#b08d3c] font-bold"
                        : "text-[#8c6b24] group-hover:text-[#b08d3c]"
                    }`}
                  >
                    {link.roman}.
                  </span>
                )}
                <span className="whitespace-nowrap">{link.label}</span>
                {isActive && (
                  <span className="absolute -bottom-[15px] left-1/2 h-0.5 w-6 -translate-x-1/2 bg-[#b08d3c]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Area */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Arc Testnet Royal Seal Badge */}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#4c5d34]/30 bg-[#edf5e5]/80 px-2.5 sm:px-3 py-1 font-cinzel text-[11px] font-semibold text-[#2f3a20] shadow-2xs transition-colors hover:border-[#4c5d34]/60 hover:bg-[#e4eed7] whitespace-nowrap shrink-0"
            title="Arc Testnet (Chain ID 5042002)"
          >
            <ArcTestnetSeal size={14} className="text-[#4c5d34] shrink-0" />
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#93bd63] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4c5d34]" />
            </span>
            <span className="tracking-wider">Arc<span className="hidden sm:inline"> Testnet</span></span>
          </a>

          {/* Wallet connection: visible right after Arc Testnet badge, always visible */}
          <div className="shrink-0 flex items-center">
            {mounted && isConnected && address ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex rounded-md border border-[#d6d6c8] bg-[#fbfaf6] px-2.5 py-1 font-mono text-xs text-[#1a1f12]">
                  {truncateAddress(address)}
                </span>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="btn-royal-secondary text-[11px] py-1.5 px-2.5 sm:px-3 whitespace-nowrap"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (mounted) {
                    const connector = connectors[0];
                    if (connector) connect({ connector });
                  }
                }}
                className="btn-royal-ink text-[11px] py-1.5 px-2.5 sm:px-3 whitespace-nowrap"
              >
                Connect Wallet
              </button>
            )}
          </div>

          {/* Vault Contract link if available */}
          {vaultAddress && (
            <a
              href={`${explorerUrl}/address/${vaultAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden 2xl:inline-flex items-center gap-1.5 rounded-md border border-[#d6d6c8] bg-[#fbfaf6] px-2.5 py-1 font-mono text-[11px] text-[#3c4132] transition-colors hover:border-[#b08d3c] hover:text-[#1a1f12] whitespace-nowrap shrink-0"
              title={`Vault: ${vaultAddress}`}
            >
              <span className="font-cinzel text-[10px] uppercase text-[#8c6b24]">
                Vault:
              </span>
              <span>{truncateAddress(vaultAddress)}</span>
            </a>
          )}

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

      {/* Below ~1024px collapsed menu / stacked layout */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#d6d6c8] bg-[#f5f3ea] px-4 py-3 sm:px-6 shadow-md">
          <nav className="flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : link.href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-md px-3.5 py-2 font-cinzel text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isActive
                      ? "border border-[#b08d3c]/50 bg-[#fbfaf6] text-[#1a1f12] shadow-2xs"
                      : "border border-transparent text-[#6b6e5d] hover:border-[#e5e3d8] hover:bg-[#f2ede2] hover:text-[#1a1f12]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {link.roman ? (
                      <span className="font-serif text-[#b08d3c] font-bold text-sm">
                        {link.roman}.
                      </span>
                    ) : (
                      <span className="font-serif text-[#8c6b24] font-bold text-sm">
                        ★
                      </span>
                    )}
                    <span className="whitespace-nowrap">{link.label}</span>
                  </div>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#b08d3c]" />
                  )}
                </Link>
              );
            })}
          </nav>
          {vaultAddress && (
            <div className="mt-3 border-t border-[#e5e3d8] pt-2.5">
              <a
                href={`${explorerUrl}/address/${vaultAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-md border border-[#d6d6c8] bg-[#fbfaf6] px-3 py-1.5 font-mono text-[11px] text-[#3c4132]"
              >
                <span className="font-cinzel text-[10px] uppercase text-[#8c6b24]">
                  Vault Contract:
                </span>
                <span>{truncateAddress(vaultAddress)}</span>
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
