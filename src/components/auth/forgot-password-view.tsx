"use client";

import * as React from "react";
import Link from "next/link";
import { VodexBrandLockup } from "@/components/brand/vodex-brand-lockup";
import { motion } from "framer-motion";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { variants } from "@/lib/motion";
import { authResetPasswordForEmail, humanizeAuthError } from "@/lib/auth";

export function ForgotPasswordView() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    const { error: resetError } = await authResetPasswordForEmail(email);

    if (resetError) {
      setError(humanizeAuthError(resetError.message));
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <VodexBrandLockup variant="auth" href="/" />
        </div>

        <div className="overflow-hidden rounded-[var(--radius-xl)] bg-glass backdrop-blur-xl shadow-[var(--shadow-glass)] ring-1 ring-white/60 dark:ring-white/[0.08] p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-positive/10 ring-1 ring-positive/20">
                <Check className="size-6 text-positive" strokeWidth={2} />
              </div>
              <h1 className="text-[18px] font-semibold tracking-[-0.04em] text-foreground">
                Check your email
              </h1>
              <p className="mt-2 text-[13px] text-muted-foreground">
                We sent a password reset link to <strong>{email}</strong>.
              </p>
              <p className="mt-3 text-[12px] text-muted-foreground">
                Didn&apos;t receive it?{" "}
                <button
                  className="text-accent hover:underline underline-offset-4"
                  onClick={() => setSent(false)}
                >
                  Send again
                </button>
              </p>
              <Link
                href="/auth/login"
                className="mt-6 inline-block text-[13px] text-accent hover:underline underline-offset-4"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-[20px] font-semibold tracking-[-0.04em] text-foreground">
                Reset your password
              </h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {error && (
                <motion.div
                  key={error}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-[12px] text-destructive ring-1 ring-destructive/20"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                  {error}
                </motion.div>
              )}

              <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[12px] font-medium text-foreground">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading}
                    required
                  />
                </div>

                <Button
                  variant="accent"
                  size="lg"
                  className="w-full"
                  type="submit"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" aria-label="Sending…" />
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>

              <p className="mt-5 text-center text-[13px] text-muted-foreground">
                Remember your password?{" "}
                <Link
                  href="/auth/login"
                  className="text-accent hover:underline underline-offset-4"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
