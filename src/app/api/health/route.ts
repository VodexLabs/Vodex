import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/** Canonical liveness probe for stable live E2E orchestration. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "vodex",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
  });
}
