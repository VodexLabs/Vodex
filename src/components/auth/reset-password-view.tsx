"use client";

import * as React from "react";
import Link from "next/link";
import { VodexBrandLockup } from "@/components/brand/vodex-brand-lockup";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { variants } from "@/lib/motion";
import { authUpdatePassword, humanizeAuthError } from "@/lib/auth";
import { cn } from "@/lib/utils";

function StrengthBar({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*]/.test(password),
  ].filter(Boolean).length;

  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-positive"];
  if (!password) return null;

  return (
    <div className="mt-2 flex gap-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition",
            i < score ? colors[score - 1] : "bg-muted/60",
          )}
        />
      ))}
    </div>
  );
}

export function ResetPasswordView() {
  const router = useRouter();

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 8 && password === confirm && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    const { error: updateError } = await authUpdatePassword(password);

    if (updateError) {
      setError(humanizeAuthError(updateError.message));
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/"), 2500);
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
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-positive/10 ring-1 ring-positive/20">
                <Check className="size-6 text-positive" strokeWidth={2} />
              </div>
              <h1 className="text-[18px] font-semibold tracking-[-0.04em] text-foreground">
                Password updated
              </h1>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Your password has been reset successfully. Redirecting…
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-[20px] font-semibold tracking-[-0.04em] text-foreground">
                Set new password
              </h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Choose a strong password for your account.
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
                  <label htmlFor="password" className="text-[12px] font-medium text-foreground">
                    New password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      disabled={loading}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" strokeWidth={1.55} />
                      ) : (
                        <Eye className="size-4" strokeWidth={1.55} />
                      )}
                    </button>
                  </div>
                  <StrengthBar password={password} />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm" className="text-[12px] font-medium text-foreground">
                    Confirm password
                  </label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Repeat password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="new-password"
                    className={
                      mismatch
                        ? "ring-1 ring-destructive/50 focus-visible:ring-destructive"
                        : ""
                    }
                  />
                  {mismatch && (
                    <p className="text-[11px] text-destructive">
                      Passwords do not match.
                    </p>
                  )}
                </div>

                <Button
                  variant="accent"
                  size="lg"
                  className="w-full"
                  type="submit"
                  disabled={!canSubmit}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" aria-label="Updating…" />
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>

              <p className="mt-5 text-center text-[13px] text-muted-foreground">
                <Link
                  href="/auth/login"
                  className="text-accent hover:underline underline-offset-4"
                >
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
