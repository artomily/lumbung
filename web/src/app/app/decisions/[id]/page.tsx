import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMicro, parseMicro } from "@/lib/money";
import { env } from "@/lib/env";
import { getDecisionById } from "@/lib/queries";
import { ActionBadge, StatusBadge, CategoryBadge } from "@/components/Badges";
import { VerifyReasonHash } from "@/components/VerifyReasonHash";
import { CornerFlourish } from "@/components/ornaments/CornerFlourish";
import { RoyalSeal } from "@/components/ornaments/RoyalSeal";

export const dynamic = "force-dynamic";

export default async function DecisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decision = await getDecisionById(id);

  if (!decision) {
    notFound();
  }

  const explorerUrl = env.NEXT_PUBLIC_ARC_EXPLORER || "https://explorer.testnet.arc.io";
  const vaultAddress = env.LUMBUNG_VAULT_ADDRESS || env.NEXT_PUBLIC_LUMBUNG_VAULT_ADDRESS || null;

  return (
    <div className="page-container w-full px-4 sm:px-6 lg:px-10 xl:px-14 space-y-7">
      {/* Breadcrumb & Navigation */}
      <div>
        <div className="flex flex-wrap items-center gap-2 font-cinzel text-xs font-semibold text-[#6b6e5d] mb-4">
          <Link
            href="/app"
            className="text-[#8c6b24] hover:text-[#b08d3c] transition-colors"
          >
            Royal Granary
          </Link>
          <span className="text-[#d6d6c8]">/</span>
          <Link
            href="/app/decisions"
            className="hover:text-[#1a1f12] transition-colors"
          >
            Chronicle of Decisions
          </Link>
          <span className="text-[#d6d6c8]">/</span>
          <span className="font-mono text-[#1a1f12]">#{decision.id.slice(0, 8)}</span>
        </div>

        {/* Heading Card */}
        <div className="parchment-card parchment-card-inner relative overflow-hidden p-6 sm:p-8">
          {/* Corner Flourishes */}
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <CornerFlourish position="tl" size={20} />
          </div>
          <div className="absolute top-2 right-2 z-10 pointer-events-none">
            <CornerFlourish position="tr" size={20} />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-start gap-4">
              <RoyalSeal size={40} variant="gold" />
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-serif text-xl font-bold text-[#b08d3c]">Decision Audit</span>
                  <span className="font-mono text-sm font-bold text-[#1a1f12]">#{decision.id}</span>
                </div>
                <p className="mt-1 font-serif text-xs sm:text-sm text-[#6b6e5d] italic">
                  Recorded in Chronicle at {new Date(decision.createdAt).toUTCString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ActionBadge action={decision.action} />
              <StatusBadge status={decision.currentStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Decision Parameters & Attributes */}
        <div className="space-y-6 lg:col-span-1">
          <div className="parchment-card parchment-card-inner p-5 space-y-4 text-xs">
            <h3 className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#1a1f12] border-b border-[#d6d6c8] pb-2">
              Parameters & Attributes
            </h3>

            <div className="space-y-3 font-mono text-[11px]">
              <div>
                <span className="block font-cinzel text-[10px] uppercase text-[#6b6e5d]">
                  Granary Envelope:
                </span>
                <span className="mt-0.5 inline-block">
                  <CategoryBadge category={decision.category} />
                </span>
              </div>

              <div>
                <span className="block font-cinzel text-[10px] uppercase text-[#6b6e5d]">
                  Disbursement Amount:
                </span>
                <span className="font-bold text-sm text-[#1a1f12]">
                  {formatMicro(parseMicro(decision.amountMicro))}
                </span>
              </div>

              <div>
                <span className="block font-cinzel text-[10px] uppercase text-[#6b6e5d]">
                  Recipient Address:
                </span>
                {decision.toWallet ? (
                  <a
                    href={`${explorerUrl}/address/${decision.toWallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all hover:underline text-[#4c5d34]"
                  >
                    {decision.toWallet}
                  </a>
                ) : (
                  <span className="text-[#6b6e5d]">—</span>
                )}
              </div>

              <div>
                <span className="block font-cinzel text-[10px] uppercase text-[#6b6e5d]">
                  Subject ID / Reference:
                </span>
                <span className="text-[#1a1f12]">{decision.subjectId}</span>
              </div>

              <div>
                <span className="block font-cinzel text-[10px] uppercase text-[#6b6e5d]">
                  Decision Key (Contract Key):
                </span>
                <span className="break-all text-[#6b6e5d]">{decision.decisionKey}</span>
              </div>

              <div>
                <span className="block font-cinzel text-[10px] uppercase text-[#6b6e5d]">
                  AI Model Utilized:
                </span>
                <span className="text-[#1a1f12]">{decision.llmModel || "deterministic-fallback"}</span>
              </div>

              {decision.txHash && (
                <div>
                  <span className="block font-cinzel text-[10px] uppercase text-[#6b6e5d]">
                    Arc Settlement Transaction:
                  </span>
                  <a
                    href={`${explorerUrl}/tx/${decision.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-bold text-[#4c5d34] hover:underline"
                  >
                    {decision.txHash}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 2-Columns: AI Reasoning, Rules Evaluated, ReasonHash */}
        <div className="space-y-6 lg:col-span-2">
          {/* Agent Reasoning Box */}
          <div className="parchment-card parchment-card-inner p-6 space-y-3">
            <h3 className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#1a1f12]">
              Keeper AI Rationale & Verdict
            </h3>
            <div className="rounded-md border border-[#e5e3d8] bg-[#fbfaf6] p-4">
              <p className="font-serif text-sm sm:text-base italic text-[#1a1f12] leading-relaxed">
                &ldquo;{decision.reasoning}&rdquo;
              </p>
            </div>
            {decision.recommendationIfEscalated && (
              <div className="rounded-md border border-[#b08d3c]/40 bg-[#f6efe0]/60 p-3 font-serif text-xs text-[#785918]">
                <strong>Escalation Recommendation:</strong> {decision.recommendationIfEscalated}
              </div>
            )}
          </div>

          {/* Hard Rules Table */}
          <div className="parchment-card parchment-card-inner p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#1a1f12]">
                Hard Policy Rules Evaluation (R1 – R12)
              </h3>
              <span className="font-serif text-[11px] text-[#6b6e5d] italic">
                Deterministic Boundary
              </span>
            </div>

            <div className="overflow-x-auto rounded-md border border-[#d6d6c8]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-[#d6d6c8] bg-[#f2ede2]/70 font-cinzel text-[10px] uppercase text-[#6b6e5d]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Rule</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Allowed Actions</th>
                    <th className="px-3 py-2 font-semibold">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e3d8] text-[11px] bg-[#fbfaf6]">
                  {Array.isArray(decision.ruleResults) && decision.ruleResults.length > 0 ? (
                    decision.ruleResults.map((r: { ruleId?: string; passed?: boolean; allowedActions?: string[]; message?: string }, idx: number) => (
                      <tr key={idx} className="transition-colors hover:bg-[#f2ede2]/40">
                        <td className="px-3 py-2 font-bold text-[#1a1f12]">{r.ruleId || `R${idx + 1}`}</td>
                        <td className="px-3 py-2">
                          {r.passed ? (
                            <span className="inline-flex rounded-xs bg-[#edf5e5] px-1.5 py-0.5 font-cinzel text-[10px] font-bold text-[#2f3a20]">
                              PASS
                            </span>
                          ) : (
                            <span className="inline-flex rounded-xs bg-[#fcf0ee] px-1.5 py-0.5 font-cinzel text-[10px] font-bold text-[#8c2a24]">
                              BLOCK
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[#785918]">
                          {r.allowedActions ? r.allowedActions.join(", ") : "—"}
                        </td>
                        <td className="px-3 py-2 text-[#6b6e5d] font-sans text-xs italic">
                          {r.message || "Condition verified."}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 font-serif italic text-[#6b6e5d]">
                        No individual rule traces archived for this record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cryptographic reasonHash Verification Component */}
          <VerifyReasonHash
            decisionKey={decision.decisionKey}
            storedReasonHash={decision.reasonHash}
            snapshot={decision.snapshot}
            ruleResults={decision.ruleResults}
            action={decision.action}
            reasoning={decision.reasoning}
            txHash={decision.txHash}
            vaultAddress={vaultAddress}
          />

          {/* Full Snapshot JSON (Collapsible) */}
          <details className="parchment-card parchment-card-inner p-5 group">
            <summary className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#1a1f12] cursor-pointer flex items-center justify-between">
              <span>View Archived Snapshot JSON</span>
              <span className="font-serif text-xs text-[#8c6b24] group-open:rotate-90 transition-transform">
                ▶
              </span>
            </summary>
            <div className="mt-4 overflow-x-auto rounded-md border border-[#d6d6c8] bg-[#fbfaf6] p-3 text-[11px] font-mono text-[#1a1f12]">
              <pre>{JSON.stringify(decision.snapshot, null, 2)}</pre>
            </div>
          </details>

          {/* Status Timeline / Events */}
          {decision.events && decision.events.length > 0 && (
            <div className="parchment-card parchment-card-inner p-5 space-y-3">
              <h3 className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#1a1f12]">
                Audit Trail Timeline
              </h3>
              <div className="space-y-2 border-l-2 border-[#b08d3c]/40 pl-3">
                {decision.events.map((evt, idx) => (
                  <div key={evt.id || idx} className="text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#6b6e5d]">
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </span>
                      <StatusBadge status={evt.status} />
                    </div>
                    {evt.txHash && (
                      <div className="font-mono text-[11px] text-[#4c5d34]">
                        tx:{" "}
                        <a
                          href={`${explorerUrl}/tx/${evt.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {evt.txHash.slice(0, 16)}...
                        </a>
                      </div>
                    )}
                    {evt.error && (
                      <div className="font-sans text-[11px] text-[#8c2a24] italic">
                        {evt.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
