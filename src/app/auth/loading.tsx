import { DreamOS86BrandIcon } from "@/components/brand/dreamos86-brand-icon";

/**
 * Streamed auth loading UI — rendered by Next.js during any auth route
 * navigation, including /auth/callback while the server exchanges
 * the PKCE code for a session.
 */
export default function AuthLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-atmosphere px-4">
      {/* Logo mark */}
      <div className="relative">
        <div className="absolute inset-0 -z-10 animate-ping rounded-full bg-accent/20" />
        <DreamOS86BrandIcon variant="auth" />
      </div>

      {/* Animated progress bar */}
      <div className="h-0.5 w-48 overflow-hidden rounded-full bg-border">
        <div className="h-full w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite] rounded-full bg-accent" />
      </div>

      <p className="text-[13px] text-muted-foreground">
        Setting up your workspace…
      </p>
    </div>
  );
}
