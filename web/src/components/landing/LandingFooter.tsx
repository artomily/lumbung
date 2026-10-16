import React from "react";
import Link from "next/link";
import Image from "next/image";

interface NavLinkItem {
  label: string;
  href: string;
  external?: boolean;
}

/**
 * Original inline SVG royal seal compass-rose-in-double-ring emblem.
 * Features:
 * - 8-point compass rose
 * - 4 diagonal points filled at 85% opacity
 * - 4 cardinal points half-filled / half-outlined for an authentic engraved look
 * - Double concentric outer rings with delicate beaded middle ring
 * - Tiny paper-colored center dot
 */
function RoyalCompassSeal({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Double concentric outer rings */}
      <circle cx="50" cy="50" r="47" stroke="#1a1f12" strokeWidth="1.4" />
      <circle
        cx="50"
        cy="50"
        r="43.5"
        stroke="#1a1f12"
        strokeWidth="0.8"
        strokeDasharray="1 1.5"
      />
      <circle cx="50" cy="50" r="41" stroke="#1a1f12" strokeWidth="0.6" />

      {/* 4 Diagonal points: filled at 85% opacity */}
      <polygon
        points="50,50 50.0,41.5 69.09,30.91 58.5,50.0"
        fill="#1a1f12"
        fillOpacity="0.85"
      />
      <polygon
        points="50,50 58.5,50.0 69.09,69.09 50.0,58.5"
        fill="#1a1f12"
        fillOpacity="0.85"
      />
      <polygon
        points="50,50 50.0,58.5 30.91,69.09 41.5,50.0"
        fill="#1a1f12"
        fillOpacity="0.85"
      />
      <polygon
        points="50,50 41.5,50.0 30.91,30.91 50.0,41.5"
        fill="#1a1f12"
        fillOpacity="0.85"
      />

      {/* 4 Cardinal points: half-filled, half-outlined for engraved look */}
      {/* North */}
      <polygon points="50,50 43.99,43.99 50.0,10.0" fill="#1a1f12" />
      <polygon
        points="50,50 50.0,10.0 56.01,43.99"
        fill="none"
        stroke="#1a1f12"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* East */}
      <polygon points="50,50 56.01,43.99 90.0,50.0" fill="#1a1f12" />
      <polygon
        points="50,50 90.0,50.0 56.01,56.01"
        fill="none"
        stroke="#1a1f12"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* South */}
      <polygon points="50,50 56.01,56.01 50.0,90.0" fill="#1a1f12" />
      <polygon
        points="50,50 50.0,90.0 43.99,56.01"
        fill="none"
        stroke="#1a1f12"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* West */}
      <polygon points="50,50 43.99,56.01 10.0,50.0" fill="#1a1f12" />
      <polygon
        points="50,50 10.0,50.0 43.99,43.99"
        fill="none"
        stroke="#1a1f12"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* Tiny paper-colored center dot */}
      <circle
        cx="50"
        cy="50"
        r="3.5"
        fill="#f5f3ea"
        stroke="#1a1f12"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();
  const explorerUrl =
    process.env.NEXT_PUBLIC_ARC_EXPLORER || "https://explorer.testnet.arc.io";

  const navLinks: NavLinkItem[] = [
    { label: "Treasury", href: "/app" },
    { label: "Chronicle", href: "/app/decisions" },
    { label: "Royal Seal", href: "/app/approvals" },
    { label: "Records", href: "/app/metrics" },
    { label: "How it works", href: "#how" },
    { label: "Verify", href: "#verify" },
    { label: "FAQ", href: "#faq" },
    { label: "Arc Explorer", href: explorerUrl, external: true },
  ];

  return (
    <footer className="landing-footer-container">
      {/* Content block: FIRST visually (order 1), centered top */}
      <div className="landing-footer-content space-y-3 sm:space-y-3.5">
        {/* (a) Emblem */}
        <RoyalCompassSeal className="landing-footer-emblem" />

        {/* (b) Wordmark */}
        <div className="landing-footer-wordmark">lumbung</div>

        {/* (c) Tagline */}
        <p className="landing-footer-tagline">
          The open granary of OWatch. Every reward point backed, every payout on-chain.
        </p>

        {/* (d) Nav links */}
        <nav aria-label="Footer Navigation" className="w-full pt-1 pb-1">
          <ul className="landing-footer-nav">
            {navLinks.map((link) => (
              <li key={link.label} className="landing-footer-nav-item">
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="landing-footer-link"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link href={link.href} className="landing-footer-link">
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* (e) Small muted copyright */}
        <p className="landing-footer-copyright">
          © {currentYear} Lumbung · AI treasury keeper of OWatch on Arc
        </p>
      </div>

      {/* Illustration: SECOND visually (order 2), decorative panorama */}
      <Image
        src="/illustrations/lumbung-village-panorama.webp"
        alt=""
        aria-hidden="true"
        width={1916}
        height={821}
        unoptimized
        className="landing-footer-illustration"
      />
    </footer>
  );
}
