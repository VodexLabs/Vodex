import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  applySignupConsentToProfile,
  TERMS_VERSION,
  type SignupConsentPayload,
} from "@/lib/auth/signup-consent";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    termsAccepted?: boolean;
    marketingOptIn?: boolean;
  };

  if (!body.termsAccepted) {
    return NextResponse.json({ error: "Terms acceptance required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const payload: SignupConsentPayload = {
    termsAccepted: true,
    marketingOptIn: Boolean(body.marketingOptIn),
  };

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip");

  await applySignupConsentToProfile(admin, user.id, payload, ip);

  return NextResponse.json({
    ok: true,
    termsVersion: TERMS_VERSION,
    marketingOptIn: payload.marketingOptIn,
  });
}
