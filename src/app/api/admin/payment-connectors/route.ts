import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ connections: [] });

  const { data, error } = await admin
    .from("payment_provider_connections" as never)
    .select("project_id, provider, status, mode, last_verified_at, last_error")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ connections: [], warning: error.message });
  }

  type ConnRow = {
    project_id: string;
    provider: string;
    status: string;
    mode: string;
    last_verified_at: string | null;
    last_error: string | null;
  };

  return NextResponse.json({
    connections: ((data ?? []) as unknown as ConnRow[]).map((r) => ({
      project_id: r.project_id,
      provider: r.provider,
      status: r.status,
      mode: r.mode,
      last_verified_at: r.last_verified_at,
      last_error: r.last_error ? String(r.last_error).slice(0, 120) : null,
    })),
  });
}
