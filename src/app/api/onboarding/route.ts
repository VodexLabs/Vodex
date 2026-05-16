import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  workspace_name: z.string().min(1).max(100).optional(),
  use_case: z.string().optional(),
  experience_level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  preferred_model: z.string().optional(),
  referral_source: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const answers = parsed.data;
  const now = new Date().toISOString();

  // Upsert onboarding record
  await supabase.from("onboarding").upsert({
    user_id: user.id,
    completed_at: now,
    workspace_name: answers.workspace_name ?? null,
    use_case: answers.use_case ?? null,
    experience_level: answers.experience_level ?? null,
    preferred_model: answers.preferred_model ?? null,
    referral_source: answers.referral_source ?? null,
    answers,
  });

  // Mark profile as onboarding completed
  await supabase.from("profiles").update({
    onboarding_completed: true,
    onboarding_completed_at: now,
    use_case: answers.use_case ?? null,
    experience_level: answers.experience_level ?? null,
    default_model_id: answers.preferred_model ?? "claude-3-5-sonnet",
  }).eq("id", user.id);

  // Update workspace name if provided
  if (answers.workspace_name) {
    await supabase.from("workspaces").update({
      name: answers.workspace_name,
    }).eq("owner_id", user.id);
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    completed: profile?.onboarding_completed ?? false,
    completed_at: profile?.onboarding_completed_at,
  });
}
