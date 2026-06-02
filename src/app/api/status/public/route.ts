import { NextResponse } from "next/server";
import { fetchPublicStatusPayload } from "@/lib/status/status-public";

export async function GET() {
  const payload = await fetchPublicStatusPayload();
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
  });
}
