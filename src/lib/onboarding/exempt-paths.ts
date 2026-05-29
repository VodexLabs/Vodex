/**
 * Paths where users may use the product before finishing the onboarding wizard.
 * Prevents redirect loops when starting builds from /create → /apps/.../builder.
 */

export function isOnboardingExemptPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/onboarding")) return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname === "/create" || pathname.startsWith("/create/")) return true;
  if (pathname === "/chat" || pathname.startsWith("/chat/")) return true;
  if (pathname.startsWith("/apps/") && (pathname.includes("/builder") || pathname.includes("/dashboard"))) {
    return true;
  }
  return false;
}
