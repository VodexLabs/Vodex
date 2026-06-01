import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageGuard } from "@/components/auth/auth-page-guard";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";

/** Auth flows use client search params; keep dynamic without forcing the whole app. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Vodex",
    template: "%s | Vodex",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSessionProvider>
      <div className="min-h-screen bg-atmosphere">
        <Suspense fallback={null}>
          <AuthPageGuard>{children}</AuthPageGuard>
        </Suspense>
      </div>
    </AuthSessionProvider>
  );
}
