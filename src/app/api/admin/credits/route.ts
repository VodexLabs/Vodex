import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";

/** Legacy direct grant route — disabled; admin changes require OTP confirmation flow. */
export async function POST() {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  return NextResponse.json(
    {
      error: "This endpoint is disabled. Use POST /api/admin/confirmations/request with OTP verification.",
    },
    { status: 410 },
  );
}
