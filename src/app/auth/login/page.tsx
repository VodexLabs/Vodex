import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginView } from "@/components/auth/login-view";

export const metadata: Metadata = { title: "Sign In" };

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginView />
    </Suspense>
  );
}
