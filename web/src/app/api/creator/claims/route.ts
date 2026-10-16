import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { type Hex } from "viem";
import { verifyMessage, getAddress, isAddress } from "viem";
import { env } from "@/lib/env";
import { decideCreatorClaim } from "@/agent/creator";

const ClaimBodySchema = z.object({
  claimId: z.string().min(1),
  creatorName: z.string().min(1),
  wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  videoUrl: z.string().url(),
  videoId: z.string().min(1),
  amountMicro: z.string().regex(/^\d+$/).transform((v) => BigInt(v)),
});

// ── POST /api/creator/claims ──────────────────────────────────────────────────
// Auth: signed message from OWNER_ADDRESS (sign-in-with-wallet)
// Header: X-Owner-Message + X-Owner-Signature
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify owner wallet signature
  const ownerAddress = env.OWNER_ADDRESS;
  if (!ownerAddress) {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "OWNER_ADDRESS not configured" } },
      { status: 500 },
    );
  }

  const ownerMsg = req.headers.get("x-owner-message");
  const ownerSig = req.headers.get("x-owner-signature");

  if (!ownerMsg || !ownerSig) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Missing X-Owner-Message or X-Owner-Signature header" } },
      { status: 401 },
    );
  }

  // Verify the signature matches OWNER_ADDRESS
  let signerAddress: string;
  try {
    const valid = await verifyMessage({
      address: getAddress(ownerAddress) as Hex,
      message: ownerMsg,
      signature: ownerSig as Hex,
    });
    if (!valid) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Signature does not match owner address" } },
        { status: 401 },
      );
    }
    signerAddress = ownerAddress;
  } catch {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid signature format" } },
      { status: 401 },
    );
  }

  // Validate body
  let parsed: z.infer<typeof ClaimBodySchema>;
  try {
    parsed = ClaimBodySchema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.errors[0]?.message : "Validation error";
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: msg } }, { status: 422 });
  }

  // Validate wallet format
  if (!isAddress(parsed.wallet)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid wallet address" } }, { status: 422 });
  }

  try {
    const result = await decideCreatorClaim({
      claimId: parsed.claimId,
      creatorName: parsed.creatorName,
      wallet: parsed.wallet,
      videoUrl: parsed.videoUrl,
      videoId: parsed.videoId,
      amountMicro: parsed.amountMicro,
    });

    return NextResponse.json(
      { decisionId: result.decisionId, status: "PENDING", signerAddress },
      { status: 202 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/creator/claims] decideCreatorClaim failed:", err);
    return NextResponse.json({ error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
