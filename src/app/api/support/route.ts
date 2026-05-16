import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(5000),
  category: z.enum(["general", "billing", "technical", "abuse", "feature"]).default("general"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});

const replySchema = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get("id");

  if (ticketId) {
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("*, ticket_replies(*)")
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .single();
    return NextResponse.json({ ticket });
  }

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, status, category, priority, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ tickets });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Reply to existing ticket
  if (body.ticket_id) {
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { data: reply, error } = await supabase
      .from("ticket_replies")
      .insert({
        ticket_id: parsed.data.ticket_id,
        user_id: user.id,
        body: parsed.data.body,
        is_staff: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reply }, { status: 201 });
  }

  // Create new ticket
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket }, { status: 201 });
}
