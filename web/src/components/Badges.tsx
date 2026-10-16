import React from "react";

export function ActionBadge({ action }: { action: string }) {
  const normalized = action?.toUpperCase();
  let color = "bg-[#f2ede2] text-[#1a1f12] border-[#d6d6c8]";

  if (normalized === "PAY") {
    color = "bg-[#edf5e5] text-[#2f3a20] border-[#93bd63]/60";
  } else if (normalized === "HOLD") {
    color = "bg-[#e8e9dd] text-[#262b1c] border-[#d6d6c8]";
  } else if (normalized === "ESCALATE") {
    color = "bg-[#f6efe0] text-[#785918] border-[#b08d3c]/60";
  } else if (normalized === "REJECT") {
    color = "bg-[#fcf0ee] text-[#8c2a24] border-[#d9857e]/60";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-sm font-cinzel text-[11px] font-bold tracking-wider uppercase border shadow-2xs ${color}`}
    >
      {action}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toUpperCase();
  let color = "bg-[#f2ede2] text-[#3c4132] border-[#d6d6c8]";
  let dotColor = "bg-[#6b6e5d]";

  if (normalized === "CONFIRMED" || normalized === "OWNER_APPROVED" || normalized === "PAID") {
    color = "bg-[#edf5e5] text-[#2f3a20] border-[#93bd63]/50";
    dotColor = "bg-[#4c5d34]";
  } else if (normalized === "AWAITING_OWNER" || normalized === "ESCALATED") {
    color = "bg-[#f6efe0] text-[#785918] border-[#b08d3c]/50";
    dotColor = "bg-[#b08d3c] animate-pulse";
  } else if (normalized === "SUBMITTED" || normalized === "PROPOSED" || normalized === "PENDING") {
    color = "bg-[#fbf7ed] text-[#785918] border-[#d6d6c8]";
    dotColor = "bg-[#b08d3c] animate-pulse";
  } else if (normalized === "HELD") {
    color = "bg-[#e8e9dd] text-[#262b1c] border-[#d6d6c8]";
    dotColor = "bg-[#6b6e5d]";
  } else if (normalized === "REJECTED" || normalized === "OWNER_REJECTED" || normalized === "FAILED") {
    color = "bg-[#fcf0ee] text-[#8c2a24] border-[#d9857e]/50";
    dotColor = "bg-[#8c2a24]";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-cinzel font-medium uppercase tracking-wider border ${color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {status}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const normalized = category?.toUpperCase();
  let color = "bg-[#f2ede2] text-[#3c4132] border-[#d6d6c8]";

  if (normalized === "REWARD") {
    // Viewer Harvest / Reward
    color = "bg-[#edf5e5] text-[#2f3a20] border-[#93bd63]/50";
  } else if (normalized === "CREATOR") {
    // Scribes & Creators
    color = "bg-[#f6efe0] text-[#785918] border-[#b08d3c]/50";
  } else if (normalized === "OPS") {
    // Protocol Garrison & Operations
    color = "bg-[#e8e9dd] text-[#262b1c] border-[#d6d6c8]";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-mono font-medium tracking-wide border ${color}`}
    >
      {category}
    </span>
  );
}
