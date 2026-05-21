import { safeFetch } from "@/lib/network/safe-fetch";

export async function testSupabaseAnon(url: string, anonKey: string): Promise<{ ok: boolean; error?: string }> {
  const base = url.replace(/\/$/, "");
  const { response: res, error: fetchErr } = await safeFetch(
    `${base}/rest/v1/`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    },
    "integrations_test_supabase_anon",
  );
  if (!res) {
    return { ok: false, error: fetchErr?.userMessage ?? "Could not reach Supabase REST" };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, error: `Anon key rejected (${res.status})` };
  }
  return { ok: true };
}

export async function testSupabaseServiceRole(
  url: string,
  serviceKey: string,
): Promise<{ ok: boolean; error?: string }> {
  const base = url.replace(/\/$/, "");
  const { response: res, error: fetchErr } = await safeFetch(
    `${base}/rest/v1/`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
    "integrations_test_supabase_service",
  );
  if (!res) {
    return { ok: false, error: fetchErr?.userMessage ?? "Could not reach Supabase with service key" };
  }
  if (!res.ok && res.status !== 404) {
    return { ok: false, error: `Service role key failed (${res.status})` };
  }
  return { ok: true };
}

export function extractSupabaseRef(url: string): string | null {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}
