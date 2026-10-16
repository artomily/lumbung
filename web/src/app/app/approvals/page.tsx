import React from "react";
import Link from "next/link";
import { env } from "@/lib/env";
import { getPendingApprovals, getVaultInfo } from "@/lib/queries";
import { ApprovalsClient } from "./ApprovalsClient";
import { ConfigNotice } from "@/components/ConfigNotice";
import { RoyalSeal } from "@/components/ornaments/RoyalSeal";
import { CornerFlourish } from "@/components/ornaments/CornerFlourish";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const [approvals, vaultInfo] = await Promise.all([
    getPendingApprovals(),
    getVaultInfo(),
  ]);

  const explorerUrl = env.NEXT_PUBLIC_ARC_EXPLORER || "https://explorer.testnet.arc.io";

  return (
    <div className="page-container w-full px-4 sm:px-6 lg:px-10 xl:px-14 space-y-8">
      {/* Back Link to Treasury */}
      <div className="-mb-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 font-cinzel text-xs font-semibold text-[#8c6b24] hover:text-[#b08d3c] transition-colors"
        >
          <span>←</span>
          <span>Back to Royal Granary</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="parchment-card parchment-card-inner relative overflow-hidden p-6 sm:p-8">
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <CornerFlourish position="tl" size={20} />
        </div>
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <CornerFlourish position="tr" size={20} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-start gap-4">
            <RoyalSeal size={44} variant="gold" />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-serif text-xl font-bold text-[#b08d3c]">III.</span>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-[#1a1f12]">
                  Royal Seal Escalations
                </h1>
                <span className="rounded-sm border border-[#b08d3c]/40 bg-[#f6efe0] px-2.5 py-0.5 font-cinzel text-[10px] font-bold uppercase tracking-wider text-[#785918]">
                  Imperial On-Chain Authority
                </span>
              </div>
              <p className="mt-1.5 font-serif text-xs sm:text-sm text-[#3c4132] italic max-w-3xl leading-relaxed">
                When an automated redemption or claim exceeds daily or per-transaction granary caps carved into <code>LumbungVault.sol</code>, the keeper escalates to the human owner for cryptographic seal authorization.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConfigNotice
        isDbConfigured={true}
        isVaultConfigured={vaultInfo.configured}
      />

      {/* Client Component handling Wagmi Connection, Approval & Rejection */}
      <ApprovalsClient
        initialApprovals={approvals}
        vaultInfo={vaultInfo}
        explorerUrl={explorerUrl}
      />
    </div>
  );
}
