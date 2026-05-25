import { NextResponse } from "next/server";

/** Legacy direct grant route — disabled; admin changes require OTP confirmation flow. */
export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint is disabled. Use POST /api/admin/confirmations/request with OTP verification.",
    },
    { status: 410 },
  );
}
