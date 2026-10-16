import React from "react";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { env } from "@/lib/env";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const vaultAddress = env.LUMBUNG_VAULT_ADDRESS || env.NEXT_PUBLIC_LUMBUNG_VAULT_ADDRESS || null;
  const explorerUrl = env.NEXT_PUBLIC_ARC_EXPLORER || "https://explorer.testnet.arc.io";

  return (
    <Providers>
      <div className="flex min-h-screen flex-col bg-[#f5f3ea] font-sans text-[#1a1f12]">
        <Navbar vaultAddress={vaultAddress} explorerUrl={explorerUrl} />
        <main className="flex-1 w-full py-10">{children}</main>
        <Footer />
      </div>
    </Providers>
  );
}
