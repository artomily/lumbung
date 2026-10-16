"use client";

import React, { useState } from "react";
import { createPublicClient, http, type Hex, decodeEventLog } from "viem";
import { arcTestnet } from "viem/chains";
import { hashReason } from "@/lib/canonical";
import { LumbungVaultAbi } from "@/lib/abi/LumbungVault";
import { RoyalSeal } from "./ornaments/RoyalSeal";
import { CornerFlourish } from "./ornaments/CornerFlourish";

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

export function VerifyReasonHash({
  decisionKey,
  storedReasonHash,
  snapshot,
  ruleResults,
  action,
  reasoning,
  txHash,
  vaultAddress,
}: {
  decisionKey: string;
  storedReasonHash: string;
  snapshot: unknown;
  ruleResults: unknown;
  action: string;
  reasoning: string;
  txHash: string | null;
  vaultAddress?: string | null;
}) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [computedHash, setComputedHash] = useState<string | null>(null);
  const [onChainHash, setOnChainHash] = useState<string | null>(null);
  const [onChainFound, setOnChainFound] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async () => {
    setVerifying(true);
    setErrorMsg(null);
    try {
      // 1. Recompute canonical hash client-side
      const computed = hashReason({
        snapshot,
        ruleResults,
        action,
        reasoning,
      });
      setComputedHash(computed);

      // 2. Fetch on-chain event if txHash and vault address are available
      const effectiveVault = vaultAddress || process.env.NEXT_PUBLIC_LUMBUNG_VAULT_ADDRESS;
      if (txHash && effectiveVault) {
        try {
          const receipt = await client.getTransactionReceipt({
            hash: txHash as Hex,
          });

          let foundReasonHash: string | null = null;

          for (const log of receipt.logs) {
            // Strict filter: event must be emitted by the LumbungVault contract address only
            if (log.address.toLowerCase() !== effectiveVault.toLowerCase()) {
              continue;
            }

            try {
              const decoded = decodeEventLog({
                abi: LumbungVaultAbi,
                data: log.data,
                topics: log.topics,
              });

              if (decoded.eventName === "Paid" || decoded.eventName === "ApprovalRequested") {
                const args = decoded.args as { decisionKey?: string; reasonHash?: string };
                if (args.decisionKey?.toLowerCase() === decisionKey.toLowerCase()) {
                  foundReasonHash = args.reasonHash || null;
                  break;
                }
              }
            } catch {
              // Ignore non-matching logs
            }
          }

          if (foundReasonHash) {
            setOnChainHash(foundReasonHash);
            setOnChainFound(true);
          } else {
            setOnChainFound(false);
          }
        } catch (chainErr) {
          console.warn("Could not fetch on-chain event:", chainErr);
          setOnChainFound(false);
        }
      } else {
        setOnChainFound(null);
      }

      setVerified(true);
    } catch (err: unknown) {
      console.error("Verification failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to verify reasonHash");
    } finally {
      setVerifying(false);
    }
  };

  const dbMatchesComputed =
    computedHash && storedReasonHash
      ? computedHash.toLowerCase() === storedReasonHash.toLowerCase()
      : null;

  const onChainMatchesComputed =
    computedHash && onChainHash
      ? computedHash.toLowerCase() === onChainHash.toLowerCase()
      : null;

  return (
    <div className="parchment-card parchment-card-inner relative overflow-hidden p-6 sm:p-7">
      {/* Corner Flourishes */}
      <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none">
        <CornerFlourish position="tl" size={20} />
      </div>
      <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
        <CornerFlourish position="tr" size={20} />
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <RoyalSeal size={32} variant="gold" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-[#1a1f12]">
                Cryptographic Audit: reasonHash Verification
              </h3>
              {verified && dbMatchesComputed && (
                <span className="inline-flex items-center rounded-sm bg-[#edf5e5] px-2.5 py-0.5 font-cinzel text-[10px] font-bold uppercase tracking-wider text-[#2f3a20] border border-[#93bd63]/60">
                  ✓ Verified Invariant
                </span>
              )}
            </div>
            <p className="mt-1 font-serif text-xs text-[#6b6e5d] italic">
              Every decision commits a keccak256 hash of its canonical JSON (snapshot + rules + action + reasoning) on-chain to Arc.
            </p>
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={verifying}
          className="btn-royal-ink text-[11px] py-2 px-4 self-start sm:self-auto disabled:opacity-50"
        >
          {verifying ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Verifying Audit...
            </span>
          ) : verified ? (
            "Re-Verify Proof"
          ) : (
            "Verify Cryptographic Seal"
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-md border border-[#d9857e]/60 bg-[#fcf0ee] p-3 font-serif text-xs text-[#8c2a24]">
          {errorMsg}
        </div>
      )}

      {verified && (
        <div className="mt-6 space-y-4 border-t border-[#d6d6c8] pt-5 text-xs">
          {/* Step 1: Client Recomputation */}
          <div className="rounded-md border border-[#d6d6c8] bg-[#fbfaf6] p-4">
            <div className="flex items-center justify-between">
              <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#1a1f12]">
                1. Local Canonical keccak256 Recomputation
              </span>
              {dbMatchesComputed ? (
                <span className="inline-flex items-center gap-1 font-cinzel text-[11px] font-bold text-[#4c5d34]">
                  ✓ Matches Chronicle Record
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-cinzel text-[11px] font-bold text-[#8c2a24]">
                  ✗ Integrity Mismatch
                </span>
              )}
            </div>
            <div className="mt-2.5 space-y-1.5 font-mono text-[11px]">
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <span className="text-[#785918] sm:w-28 shrink-0 font-cinzel uppercase text-[10px]">Recomputed:</span>
                <span className="text-[#1a1f12] break-all select-all">
                  {computedHash}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <span className="text-[#785918] sm:w-28 shrink-0 font-cinzel uppercase text-[10px]">Stored in DB:</span>
                <span className="text-[#1a1f12] break-all select-all">
                  {storedReasonHash}
                </span>
              </div>
            </div>
          </div>

          {/* Step 2: On-chain Verification */}
          <div className="rounded-md border border-[#d6d6c8] bg-[#fbfaf6] p-4">
            <div className="flex items-center justify-between">
              <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#1a1f12]">
                2. Arc Testnet Event Inscription Verification
              </span>
              {onChainFound && onChainMatchesComputed ? (
                <span className="inline-flex items-center gap-1 font-cinzel text-[11px] font-bold text-[#4c5d34]">
                  ✓ Verified Against On-Chain Event
                </span>
              ) : onChainFound && !onChainMatchesComputed ? (
                <span className="inline-flex items-center gap-1 font-cinzel text-[11px] font-bold text-[#8c2a24]">
                  ✗ On-chain Event Mismatch
                </span>
              ) : (
                <span className="font-serif italic text-[#6b6e5d]">
                  {txHash ? "Event log pending confirmation" : "No on-chain transaction (held off-chain)"}
                </span>
              )}
            </div>

            <div className="mt-2.5 space-y-1.5 font-mono text-[11px]">
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <span className="text-[#785918] sm:w-28 shrink-0 font-cinzel uppercase text-[10px]">Decision Key:</span>
                <span className="text-[#1a1f12] break-all select-all">
                  {decisionKey}
                </span>
              </div>
              {onChainHash && (
                <div className="flex flex-col sm:flex-row sm:gap-3">
                  <span className="text-[#785918] sm:w-28 shrink-0 font-cinzel uppercase text-[10px]">On-Chain Hash:</span>
                  <span className="text-[#1a1f12] break-all select-all">
                    {onChainHash}
                  </span>
                </div>
              )}
            </div>
          </div>

          <p className="font-serif text-[11px] text-[#6b6e5d] italic pt-1 leading-relaxed">
            Verification theorem: because <code>keccak256</code> is collision-resistant and <code>LumbungVault.sol</code> commits <code>reasonHash</code> in the non-reentrant event on Arc, neither the AI model nor database operators can alter reasoning post-disbursement.
          </p>
        </div>
      )}
    </div>
  );
}
