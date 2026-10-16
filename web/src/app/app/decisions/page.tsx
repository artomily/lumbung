import React from "react";
import Link from "next/link";
import { formatMicro, parseMicro } from "@/lib/money";
import { env } from "@/lib/env";
import { getLatestDecisions, getPublicStats } from "@/lib/queries";
import { ActionBadge, StatusBadge, CategoryBadge } from "@/components/Badges";
import { ConfigNotice } from "@/components/ConfigNotice";
import { ScrollLedger } from "@/components/ornaments/ScrollLedger";
import { CornerFlourish } from "@/components/ornaments/CornerFlourish";

export const dynamic = "force-dynamic";

export default async function DecisionsPage() {
  const [decisions, stats] = await Promise.all([
    getLatestDecisions(100),
    getPublicStats(),
  ]);

  const explorerUrl = env.NEXT_PUBLIC_ARC_EXPLORER || "https://explorer.testnet.arc.io";

  const truncate = (str: string, lead = 6, tail = 4) =>
    str ? `${str.slice(0, lead)}...${str.slice(-tail)}` : "";

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

      {/* Page Heading & Summary */}
      <div className="parchment-card parchment-card-inner relative overflow-hidden p-6 sm:p-8">
        {/* Corner Flourishes */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <CornerFlourish position="tl" size={20} />
        </div>
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <CornerFlourish position="tr" size={20} />
        </div>

        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <ScrollLedger size={42} className="shrink-0 text-[#b08d3c]" />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-serif text-xl font-bold text-[#b08d3c]">II.</span>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-[#1a1f12]">
                  Chronicle of Decisions
                </h1>
                <span className="rounded-sm border border-[#b08d3c]/40 bg-[#f6efe0] px-2.5 py-0.5 font-cinzel text-[10px] font-bold uppercase tracking-wider text-[#785918]">
                  Append-Only Ledger
                </span>
              </div>
              <p className="mt-1.5 font-serif text-xs sm:text-sm text-[#3c4132] italic max-w-3xl">
                Every payout decision, reserve rebalance, and governance escalation recorded with complete off-chain snapshot inputs, policy rule outcomes, and immutable <code>reasonHash</code> commitments.
              </p>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t border-[#e5e3d8] pt-3 sm:border-0 sm:pt-0">
            <span className="font-cinzel text-[10px] uppercase text-[#6b6e5d]">
              Audited Entries
            </span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-[#1a1f12]">
              {decisions.length}
            </span>
            <span className="font-serif text-[11px] text-[#4c5d34] italic">
              100% verified immutable
            </span>
          </div>
        </div>
      </div>

      <ConfigNotice
        isDbConfigured={stats.configured}
        isVaultConfigured={true}
      />

      {/* Decisions Ledger Table */}
      <div className="parchment-card parchment-card-inner overflow-hidden">
        {decisions.length === 0 ? (
          <div className="p-12 text-center font-serif text-sm italic text-[#6b6e5d]">
            No chronicle entries inscribed yet. Incoming viewer redemptions and keeper disbursements will appear here chronologically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#d6d6c8] bg-[#f2ede2]/70 font-cinzel text-[11px] uppercase tracking-wider text-[#6b6e5d]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Decision Key</th>
                  <th className="px-4 py-3 font-semibold">Granary</th>
                  <th className="px-4 py-3 font-semibold">Recipient</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Agent Reasoning</th>
                  <th className="px-4 py-3 font-semibold text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e3d8]">
                {decisions.map((d) => (
                  <tr
                    key={d.id}
                    className="transition-colors hover:bg-[#f2ede2]/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-[#6b6e5d]">
                      {new Date(d.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-[#1a1f12]">
                      <span title={d.decisionKey}>
                        {truncate(d.decisionKey, 8, 6)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <CategoryBadge category={d.category} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-[#1a1f12]">
                      {d.toWallet ? (
                        <a
                          href={`${explorerUrl}/address/${d.toWallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-[#4c5d34]"
                        >
                          {truncate(d.toWallet)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono font-bold text-[#1a1f12]">
                      {formatMicro(parseMicro(d.amountMicro))}
                    </td>
                    <td className="px-4 py-3.5">
                      <ActionBadge action={d.action} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="max-w-xl lg:max-w-2xl xl:max-w-4xl truncate px-4 py-3.5 font-serif text-xs italic text-[#3c4132]">
                      &ldquo;{d.reasoning}&rdquo;
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <Link
                        href={`/app/decisions/${d.id}`}
                        className="font-cinzel text-[11px] font-bold text-[#785918] hover:text-[#b08d3c]"
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
