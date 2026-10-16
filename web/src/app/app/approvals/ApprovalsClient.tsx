"use client";

import React, { useState } from "react";
import { useAccount, useConnect, useWriteContract, usePublicClient } from "wagmi";
import { type Address, type Hex } from "viem";
import { arcTestnet } from "viem/chains";
import { LumbungVaultAbi } from "@/lib/abi/LumbungVault";
import { formatMicro, parseMicro } from "@/lib/money";
import { ActionBadge, CategoryBadge } from "@/components/Badges";
import { RoyalSeal } from "@/components/ornaments/RoyalSeal";
import { CornerFlourish } from "@/components/ornaments/CornerFlourish";
import type { PendingApprovalItem, VaultInfo } from "@/lib/queries";

export function ApprovalsClient({
  initialApprovals,
  vaultInfo,
  explorerUrl,
}: {
  initialApprovals: PendingApprovalItem[];
  vaultInfo: VaultInfo;
  explorerUrl: string;
}) {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect } = useConnect();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [approvals, setApprovals] = useState(initialApprovals);
  const [loadingDecisionId, setLoadingDecisionId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<{ id: string; msg: string; txHash?: string } | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<{ id: string; msg: string } | null>(null);

  const vaultAddress = (vaultInfo.address || process.env.NEXT_PUBLIC_LUMBUNG_VAULT_ADDRESS) as Address | undefined;
  const ownerAddress = vaultInfo.owner ? vaultInfo.owner.toLowerCase() : null;
  const connectedAddress = address ? address.toLowerCase() : null;
  const isArcTestnet = chainId === arcTestnet.id;
  const isOwner = isConnected && Boolean(ownerAddress) && connectedAddress === ownerAddress;
  const canAct = isOwner && isArcTestnet;

  const truncate = (str: string, lead = 6, tail = 4) =>
    str ? `${str.slice(0, lead)}...${str.slice(-tail)}` : "";

  const handleResolve = async (
    decision: PendingApprovalItem,
    type: "approve" | "reject"
  ) => {
    if (!isArcTestnet) {
      setActionErrorMsg({ id: decision.id, msg: "Wallet is not connected to Arc Testnet (Chain ID 5042002). Please switch networks." });
      return;
    }
    if (!isOwner) {
      setActionErrorMsg({ id: decision.id, msg: "Action permitted only for vault owner." });
      return;
    }
    if (!vaultAddress) {
      setActionErrorMsg({ id: decision.id, msg: "Vault contract address is not configured." });
      return;
    }
    if (!publicClient) {
      setActionErrorMsg({ id: decision.id, msg: "Ethereum client not initialized." });
      return;
    }

    setLoadingDecisionId(decision.id);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      // 1. Submit on-chain tx via connected owner wallet
      const txHash = await writeContractAsync({
        address: vaultAddress,
        abi: LumbungVaultAbi,
        functionName: type === "approve" ? "approve" : "reject",
        args: [decision.decisionKey as Hex],
      });

      // 2. Wait for transaction to be mined on Arc Testnet
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status !== "success") {
        throw new Error(`Transaction reverted on-chain (tx: ${txHash})`);
      }

      // 3. Confirm with server API per 05-API.md
      const res = await fetch("/api/approvals/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionId: decision.id,
          txHash,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn("Server confirmation notice:", errJson);
      }

      setActionSuccessMsg({
        id: decision.id,
        msg: `Successfully ${type === "approve" ? "approved" : "rejected"} on Arc Testnet!`,
        txHash,
      });

      // Remove or mark resolved
      setApprovals((prev) => prev.filter((a) => a.id !== decision.id));
    } catch (err: unknown) {
      console.error(`Failed to ${type} decision:`, err);
      setActionErrorMsg({
        id: decision.id,
        msg: err instanceof Error ? err.message : `Failed to ${type} on-chain`,
      });
    } finally {
      setLoadingDecisionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Vault Owner Authentication Panel */}
      <div className="parchment-card parchment-card-inner p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <RoyalSeal size={32} variant="gold" />
            <div>
              <h3 className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#1a1f12]">
                Imperial Vault Owner Authentication
              </h3>
              <p className="mt-1 font-serif text-xs text-[#6b6e5d]">
                Designated Contract Owner:{" "}
                {vaultInfo.owner ? (
                  <span className="font-mono text-[#1a1f12] font-semibold">
                    {vaultInfo.owner}
                  </span>
                ) : (
                  <span className="italic text-[#785918]">Awaiting vault contract deployment</span>
                )}
              </p>
            </div>
          </div>

          <div>
            {!isConnected ? (
              <button
                onClick={() => {
                  const connector = connectors[0];
                  if (connector) connect({ connector });
                }}
                className="btn-royal-ink text-[11px] py-2 px-4"
              >
                Connect Owner Wallet
              </button>
            ) : !isArcTestnet ? (
              <div className="flex items-center gap-2 rounded-sm border border-[#d9857e]/60 bg-[#fcf0ee] px-3 py-1.5 font-cinzel text-xs font-semibold text-[#8c2a24]">
                <span className="h-2 w-2 rounded-full bg-[#8c2a24]" />
                Wrong Realm: Switch to Arc Testnet (Chain ID 5042002)
              </div>
            ) : isOwner ? (
              <div className="flex items-center gap-2 rounded-sm border border-[#93bd63]/60 bg-[#edf5e5] px-3.5 py-1.5 font-cinzel text-xs font-bold text-[#2f3a20]">
                <span className="h-2 w-2 rounded-full bg-[#4c5d34]" />
                Owner Authenticated on Arc Testnet ({truncate(address!)})
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-sm border border-[#b08d3c]/60 bg-[#f6efe0] px-3 py-1.5 font-cinzel text-xs font-semibold text-[#785918]">
                <span className="h-2 w-2 rounded-full bg-[#b08d3c]" />
                Connected ({truncate(address!)}) is not vault owner
              </div>
            )}
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="rounded-md border border-[#93bd63]/60 bg-[#edf5e5] p-4 text-xs text-[#2f3a20]">
          <p className="font-cinzel font-bold text-sm">{actionSuccessMsg.msg}</p>
          {actionSuccessMsg.txHash && (
            <p className="mt-1 font-mono text-[11px]">
              Arc Testnet Inscription:{" "}
              <a
                href={`${explorerUrl}/tx/${actionSuccessMsg.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#4c5d34]"
              >
                {actionSuccessMsg.txHash}
              </a>
            </p>
          )}
        </div>
      )}

      {/* Approvals list */}
      {approvals.length === 0 ? (
        <div className="parchment-card parchment-card-inner p-14 text-center">
          <RoyalSeal size={48} variant="gold" className="mx-auto mb-3 opacity-60" />
          <p className="font-serif text-base font-semibold text-[#1a1f12]">
            No pending escalation decrees awaiting seal
          </p>
          <p className="mt-1.5 font-serif text-xs italic text-[#6b6e5d] max-w-lg mx-auto">
            When an automated payout exceeds the smart contract envelope caps or requires human owner discretion, it will appear here for cryptographic on-chain authorization.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {approvals.map((item) => {
            const isLoading = loadingDecisionId === item.id;
            const error = actionErrorMsg?.id === item.id ? actionErrorMsg.msg : null;

            return (
              <div
                key={item.id}
                className="parchment-card parchment-card-inner relative overflow-hidden p-6 sm:p-7"
              >
                <div className="absolute top-2 left-2 z-10 pointer-events-none">
                  <CornerFlourish position="tl" size={18} />
                </div>
                <div className="absolute top-2 right-2 z-10 pointer-events-none">
                  <CornerFlourish position="tr" size={18} />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <ActionBadge action="ESCALATE" />
                      <CategoryBadge category={item.category} />
                      <span className="font-mono text-xs font-semibold text-[#785918]">
                        Decision {item.id.slice(0, 8)}...
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2.5">
                      <span className="font-serif text-3xl font-bold text-[#1a1f12]">
                        {formatMicro(parseMicro(item.amountMicro))}
                      </span>
                      <span className="font-serif text-xs italic text-[#6b6e5d]">
                        to{" "}
                        <a
                          href={`${explorerUrl}/address/${item.toWallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-medium text-[#4c5d34] hover:underline"
                        >
                          {truncate(item.toWallet, 10, 8)}
                        </a>
                      </span>
                    </div>

                    <p className="font-serif text-xs leading-relaxed text-[#3c4132]">
                      <strong className="font-cinzel text-[11px] uppercase text-[#6b6e5d] mr-1">
                        Keeper Reasoning:
                      </strong>{" "}
                      &ldquo;{item.reasoning}&rdquo;
                    </p>

                    {item.factors && item.factors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.factors.map((f, i) => (
                          <span
                            key={i}
                            className="rounded-sm border border-[#d6d6c8] bg-[#fbfaf6] px-2 py-0.5 font-serif text-[11px] text-[#3c4132]"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recommendation & Actions */}
                  <div className="flex flex-col items-end gap-3 min-w-[220px]">
                    <div className="text-right">
                      <span className="font-cinzel text-[10px] uppercase tracking-wider text-[#6b6e5d]">
                        Agent Recommendation
                      </span>
                      <div className="mt-1">
                        {item.recommendationIfEscalated === "APPROVE" ? (
                          <span className="inline-flex items-center rounded-sm bg-[#edf5e5] px-2.5 py-0.5 font-cinzel text-xs font-bold text-[#2f3a20] border border-[#93bd63]/60">
                            ✓ Recommends APPROVE
                          </span>
                        ) : item.recommendationIfEscalated === "REJECT" ? (
                          <span className="inline-flex items-center rounded-sm bg-[#fcf0ee] px-2.5 py-0.5 font-cinzel text-xs font-bold text-[#8c2a24] border border-[#d9857e]/60">
                            ✕ Recommends REJECT
                          </span>
                        ) : (
                          <span className="font-serif text-xs italic text-[#6b6e5d]">
                            Neutral Escalation
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleResolve(item, "reject")}
                        disabled={!canAct || isLoading}
                        className="rounded-md border border-[#d9857e] bg-[#fcf0ee] px-3.5 py-1.5 font-cinzel text-xs font-bold uppercase tracking-wider text-[#8c2a24] shadow-2xs hover:bg-[#f8e4e2] disabled:opacity-40 disabled:cursor-not-allowed"
                        title={
                          !isConnected
                            ? "Connect wallet to reject"
                            : !isArcTestnet
                            ? "Switch wallet network to Arc Testnet"
                            : !isOwner
                            ? "Connect the vault owner address"
                            : ""
                        }
                      >
                        {isLoading ? "Sealing..." : "Reject Decree"}
                      </button>

                      <button
                        onClick={() => handleResolve(item, "approve")}
                        disabled={!canAct || isLoading}
                        className="btn-royal-gold text-[11px] py-1.5 px-3.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={
                          !isConnected
                            ? "Connect wallet to approve"
                            : !isArcTestnet
                            ? "Switch wallet network to Arc Testnet"
                            : !isOwner
                            ? "Connect the vault owner address"
                            : ""
                        }
                      >
                        {isLoading ? "Sealing..." : "Affix Royal Seal & Pay"}
                      </button>
                    </div>

                    {!canAct && (
                      <span className="font-serif text-[11px] italic text-[#6b6e5d] text-right">
                        {!isConnected
                          ? "Connect wallet to affix seal"
                          : !isArcTestnet
                          ? "Switch network to Arc Testnet"
                          : !isOwner
                          ? "Seal permitted for vault owner only"
                          : ""}
                      </span>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="mt-3 rounded-md border border-[#d9857e]/60 bg-[#fcf0ee] p-3 font-serif text-xs text-[#8c2a24]">
                    {error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
