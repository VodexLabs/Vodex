/**
 * Next.js entry — delegates to `src/proxy.ts` (single source of truth).
 * Do not add a separate `src/middleware.ts`.
 */
import type { NextRequest } from "next/server";
import { proxy } from "./src/proxy";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|dreamos86-platform-logo.png|logo.png|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export function middleware(request: NextRequest) {
  return proxy(request);
}
