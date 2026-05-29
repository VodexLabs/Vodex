const recent404 = new Map<string, number>();
const DEDUPE_MS = 60_000;

export function shouldLogBuildEvents404(projectId: string, jobId: string): boolean {
  const key = `${projectId}:${jobId}`;
  const now = Date.now();
  const last = recent404.get(key) ?? 0;
  if (now - last < DEDUPE_MS) return false;
  recent404.set(key, now);
  if (recent404.size > 500) {
    const cutoff = now - DEDUPE_MS;
    for (const [k, t] of recent404) {
      if (t < cutoff) recent404.delete(k);
    }
  }
  return true;
}
