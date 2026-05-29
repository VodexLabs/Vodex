/** Parse JSON from a fetch Response without throwing on empty bodies. */
export async function parseJsonResponse<T = Record<string, unknown>>(
  res: Response,
): Promise<{ data: T | null; error: string | null }> {
  const text = await res.text();
  if (!text.trim()) {
    return { data: null, error: `Empty response (${res.status})` };
  }
  try {
    return { data: JSON.parse(text) as T, error: null };
  } catch {
    return { data: null, error: `Invalid JSON (${res.status})` };
  }
}
