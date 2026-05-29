/**
 * Next.js `after()` does not reliably run long background work in local dev / Turbopack.
 * E2E and development use inline fire-and-forget so the build worker actually starts.
 */
export function shouldRunInlineAsyncBuild(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.E2E_RUN_LIVE === "1" ||
    process.env.DREAMOS_INLINE_ASYNC_BUILD === "1"
  );
}
