import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildDreamosIdentity,
  toDreamosIdentityApiPayload,
} from "@/lib/identity/dreamos-identity";
import { getChargeTokensProbeCached } from "@/lib/db/charge-probe-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const identity = await buildDreamosIdentity(supabase, user.id, user.email);
  const chargeProbe = await getChargeTokensProbeCached();
  const apiAccessStatus = chargeProbe.ok ? "enabled" : "disabled";

  return NextResponse.json(toDreamosIdentityApiPayload(identity, apiAccessStatus), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
