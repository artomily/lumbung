import { NextResponse } from "next/server";
import { getPublicStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getPublicStats();
    return NextResponse.json(stats, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error generating public stats:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Failed to generate public stats",
        },
      },
      { status: 500 }
    );
  }
}
