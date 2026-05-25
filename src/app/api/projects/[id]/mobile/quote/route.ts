import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { quoteMobileAction, type MobileActionType } from "@/lib/mobile/action-pricing";

const schema = z.object({
  actionType: z.string(),
});

export async function POST(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const quote = quoteMobileAction(parsed.data.actionType as MobileActionType);
  return NextResponse.json({ quote });
}
