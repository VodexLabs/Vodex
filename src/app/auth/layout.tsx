import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthPageGuard } from "@/components/auth/auth-page-guard";

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
    <ThemeProvider>
      <div className="min-h-screen bg-atmosphere">
        <Suspense fallback={null}>
          <AuthPageGuard>{children}</AuthPageGuard>
        </Suspense>
      </div>
    </ThemeProvider>
  );
}
