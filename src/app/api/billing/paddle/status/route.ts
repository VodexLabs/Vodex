import { NextResponse } from "next/server";
import { getPaddleBillingStatus } from "@/lib/billing/paddle-billing";

/** DreamOS86 subscription billing setup state (Paddle). */
export async function GET() {
  const status = getPaddleBillingStatus();
  return NextResponse.json(status);
}
