import React from "react";
import Link from "next/link";

interface FaqItem {
  id: string;
  q: string;
  a: React.ReactNode;
}

export function FaqAccordion() {
  const faqs: FaqItem[] = [
    {
      id: "real-money",
      q: "Is this real money?",
      a: (
        <p>
          Lumbung currently runs on <strong>Arc Testnet</strong> using test USDC to safely validate autonomous treasury operations for the hackathon. The architecture is production-ready; launching on Arc Mainnet requires only an explicit configuration switch (<code className="text-xs">ARC_NETWORK=mainnet</code>) by the human owner.
        </p>
      ),
    },
    {
      id: "ai-safety",
      q: "Can the AI agent steal or misallocate funds?",
      a: (
        <p>
          <strong>No.</strong> The AI agent holds zero keys to the vault. Payouts execute through a Circle Smart Contract Account strictly bounded to <code className="text-xs">LumbungVault.sol</code>. Spending caps are enforced in immutable Solidity code; any disbursement over cap automatically diverts to the human administrator for physical cryptographic approval.
        </p>
      ),
    },
    {
      id: "owner-authority",
      q: "Who is the owner, and what authority do they hold?",
      a: (
        <p>
          The owner is the human administrator holding the vault owner address. The owner has exclusive authority to approve or reject escalated transactions via the <Link href="/app/approvals" className="underline font-semibold text-[#8c6b24]">Royal Seal Approvals</Link> portal, adjust budget caps, or trigger an emergency pause.
        </p>
      ),
    },
    {
      id: "arc-l1",
      q: "Why Arc L1 instead of Ethereum or an L2?",
      a: (
        <p>
          OWatch generates thousands of micro-payouts ($0.10–$0.50). On other networks, gas would exceed the rewards. Arc provides <strong>~$0.01 gas paid directly in USDC</strong> with instant 1-block finality, making micro-distributions economically viable without token volatility.
        </p>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {faqs.map((faq) => (
        <details
          key={faq.id}
          className="group parchment-card parchment-card-inner p-4 sm:p-5 transition-all duration-200 open:border-[#b08d3c]/80 open:shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-serif text-base sm:text-lg font-bold text-[#1a1f12] select-none focus:outline-none">
            <span>{faq.q}</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d6d6c8] bg-[#fbfaf6] text-[#8c6b24] text-xs font-bold transition-transform duration-200 group-open:rotate-45 group-hover:border-[#b08d3c] shrink-0">
              +
            </span>
          </summary>
          <div className="pt-3 font-serif text-xs sm:text-sm text-[#3c4132] leading-relaxed border-t border-[#e5e3d8] mt-3">
            {faq.a}
          </div>
        </details>
      ))}
    </div>
  );
}
