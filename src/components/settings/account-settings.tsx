"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Shield, Monitor, AlertTriangle,
  Loader2, CheckCircle2, X, Info, LogOut, Mail,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { variants } from "@/lib/motion";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCreditsStore } from "@/lib/stores/credits-store";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ name, avatarUrl, size = 64 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    "from-blue-400 to-indigo-600",
    "from-violet-400 to-purple-600",
    "from-emerald-400 to-teal-600",
    "from-rose-400 to-pink-600",
    "from-amber-400 to-orange-600",
  ];
  const colorIdx = name.charCodeAt(0) % colors.length;

  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} width={size} height={size}
        className="rounded-full object-cover" style={{ width: size, height: size }} />
    );
  }
  return (
    <div
      className={cn("flex items-center justify-center rounded-full bg-gradient-to-br text-white font-semibold select-none", colors[colorIdx])}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.3) }}
    >
      {initials}
    </div>
  );
}

// ─── Delete account modal ─────────────────────────────────────────────────────

// ─── Logout modal ─────────────────────────────────────────────────────────────

function LogoutModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { reset: resetAuth } = useAuthStore();
  const { reset: resetCredits } = useCreditsStore();
  const [loading, setLoading] = React.useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Best-effort
    }
    resetAuth();
    resetCredits?.();
    router.push("/auth/login");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm overflow-hidden rounded-[var(--radius-xl)] bg-background shadow-2xl ring-1 ring-border"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted">
              <LogOut className="size-5 text-foreground" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">Log out</p>
              <p className="text-[12px] text-muted-foreground">You&apos;ll be signed out of this device</p>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground transition">
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-[13px] text-muted-foreground">
            Are you sure you want to log out? Your projects and settings are safely saved.
          </p>
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleLogout} className="flex-1 gap-1.5" disabled={loading}>
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              {loading ? "Logging out…" : "Log out"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Delete account modal (multi-step) ───────────────────────────────────────

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { profile, reset: resetAuth } = useAuthStore();
  const { reset: resetCredits } = useCreditsStore();
  const supabase = createClient();

  // step 1 = type confirmation, step 2 = verify email, step 3 = enter code, step 4 = deleting
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [confirmation, setConfirmation] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [codeSent, setCodeSent] = React.useState(false);

  const REQUIRED = "DELETE MY ACCOUNT";
  const isReady = confirmation === REQUIRED;
  const email = profile?.email ?? "";

  async function sendVerificationEmail() {
    if (!email) { setError("No email found on your account."); return; }
    setLoading(true);
    setError(null);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (otpErr) throw otpErr;
      setCodeSent(true);
      setStep(3);
    } catch (err) {
      setError((err as Error).message ?? "Failed to send verification email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndDelete() {
    if (!email || !code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Verify OTP
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (verifyErr) throw verifyErr;

      // Call delete API
      const res = await fetch("/api/auth/delete-account", { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Deletion failed. Please contact support.");
      }

      await supabase.auth.signOut().catch(() => {});
      resetAuth();
      resetCredits?.();
      router.push("/auth/login?message=account_deleted");
    } catch (err) {
      setError((err as Error).message ?? "An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md overflow-hidden rounded-[var(--radius-xl)] bg-background shadow-2xl ring-1 ring-border"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="size-5 text-red-500" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">Delete account</p>
              <p className="text-[12px] text-muted-foreground">
                Step {step} of 3 — {step === 1 ? "Confirmation" : step === 2 ? "Verify email" : "Enter code"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground transition">
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Step 1: type confirmation */}
          {step === 1 && (
            <>
              <div className="rounded-lg bg-red-500/8 px-4 py-3 ring-1 ring-red-500/15">
                <p className="text-[12.5px] text-red-600 dark:text-red-400 font-semibold">This will permanently delete:</p>
                <ul className="mt-1.5 space-y-0.5 text-[12px] text-red-600/80 dark:text-red-400/80">
                  <li>• Your account, profile, and email</li>
                  <li>• All projects and AI conversations</li>
                  <li>• All builds, deployments, and history</li>
                  <li>• Your credit balance (non-refundable)</li>
                  <li>• All team access and permissions</li>
                </ul>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-[12px] text-destructive ring-1 ring-destructive/20">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">
                  Type <span className="font-mono font-bold text-red-500">{REQUIRED}</span> to continue
                </label>
                <input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder={REQUIRED}
                  className="h-10 w-full rounded-[var(--radius-md)] bg-surface px-3 font-mono text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-red-500/40 transition"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
                <Button
                  variant="destructive" size="sm"
                  disabled={!isReady}
                  onClick={() => { setError(null); setStep(2); }}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </>
          )}

          {/* Step 2: send verification email */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3 ring-1 ring-border">
                <Mail className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <div>
                  <p className="text-[13px] font-medium text-foreground">Verify your email address</p>
                  <p className="text-[12px] text-muted-foreground">
                    We&apos;ll send a one-time code to <strong>{email}</strong>
                  </p>
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-[12px] text-destructive ring-1 ring-destructive/20">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setStep(1)} className="flex-1" disabled={loading}>Back</Button>
                <Button variant="destructive" size="sm" onClick={sendVerificationEmail} className="flex-1 gap-1.5" disabled={loading}>
                  {loading && <Loader2 className="size-3.5 animate-spin" />}
                  {loading ? "Sending…" : "Send verification code"}
                </Button>
              </div>
            </>
          )}

          {/* Step 3: enter OTP code */}
          {step === 3 && (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 ring-1 ring-border">
                <CheckCircle2 className="size-5 shrink-0 text-positive" strokeWidth={2} />
                <p className="text-[12.5px] text-foreground">
                  Code sent to <strong>{email}</strong>. Check your inbox.
                </p>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-[12px] text-destructive ring-1 ring-destructive/20">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Enter the 6-digit code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="h-10 w-full rounded-[var(--radius-md)] bg-surface px-3 font-mono text-[14px] tracking-widest text-foreground ring-1 ring-border outline-none focus:ring-red-500/40 transition text-center"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setCode(""); setError(null); setStep(2); }} className="flex-1" disabled={loading}>
                  Resend code
                </Button>
                <Button
                  variant="destructive" size="sm"
                  disabled={code.length !== 6 || loading}
                  onClick={handleVerifyAndDelete}
                  className="flex-1 gap-1.5"
                >
                  {loading && <Loader2 className="size-3.5 animate-spin" />}
                  {loading ? "Deleting…" : "Delete permanently"}
                </Button>
              </div>
              {!codeSent && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Didn&apos;t receive it?{" "}
                  <button onClick={() => setStep(2)} className="cursor-pointer text-accent hover:underline underline-offset-2">Go back</button>
                </p>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const supabase = createClient();
  const { profile, setProfile } = useAuthStore();
  const displayName = profile?.full_name ?? profile?.email?.split("@")[0] ?? "User";
  const displayEmail = profile?.email ?? "";

  const [name, setName] = React.useState(profile?.full_name ?? "");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.id) return;
    setSaving(true);
    setSaveError(null);

    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() })
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      setSaveError(error.message);
    } else if (data) {
      setProfile(data as typeof profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>How you appear to collaborators.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="ring-2 ring-border rounded-full">
                <UserAvatar name={displayName} avatarUrl={profile?.avatar_url} size={64} />
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-surface shadow-[var(--shadow-sm)] ring-1 ring-border transition hover:bg-surface hover:ring-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Camera className="size-3 text-muted-foreground" strokeWidth={1.75} />
              </button>
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground">{displayName}</p>
              <p className="text-[12px] text-muted-foreground">{displayEmail}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Avatar upload coming soon</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[12px] font-medium text-foreground">Full name</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
                placeholder="Your name"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-foreground">Email</span>
              <Input
                type="email"
                defaultValue={displayEmail}
                className="mt-1.5 opacity-60"
                readOnly
                title="Email cannot be changed here. Use your auth provider settings."
              />
            </label>
          </div>

          {saveError && (
            <p className="text-[12px] text-destructive">{saveError}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-[12px] text-positive">
                <CheckCircle2 className="size-3.5" strokeWidth={2} /> Saved
              </span>
            )}
            <Button variant="accent" size="sm" type="submit" disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Save profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Password section ─────────────────────────────────────────────────────────

function PasswordSection() {
  const supabase = createClient();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError("New passwords don't match."); return; }
    if (next.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSaving(true);
    setError(null);

    const { error: err } = await supabase.auth.updateUser({ password: next });
    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change your account password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdate} className="space-y-4">
          <label className="block">
            <span className="text-[12px] font-medium text-foreground">Current password</span>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" className="mt-1.5" />
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-foreground">New password</span>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (8+ chars)" className="mt-1.5" />
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-foreground">Confirm new password</span>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm" className="mt-1.5" />
          </label>
          {error && <p className="text-[12px] text-destructive">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-[12px] text-positive">
                <CheckCircle2 className="size-3.5" strokeWidth={2} /> Updated
              </span>
            )}
            <Button variant="accent" size="sm" type="submit" disabled={saving || !current || !next || !confirm} className="gap-1.5">
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AccountSettings() {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  return (
    <div className="space-y-6">
      <motion.div variants={variants.staggerContainer} initial="hidden" animate="show" className="space-y-6">
        {/* Profile */}
        <motion.div variants={variants.staggerItem}>
          <ProfileSection />
        </motion.div>

        {/* Password */}
        <motion.div variants={variants.staggerItem}>
          <PasswordSection />
        </motion.div>

        {/* 2FA */}
        <motion.div variants={variants.staggerItem}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="size-4 text-accent" strokeWidth={1.55} />
                <div>
                  <CardTitle>Two-factor authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account.</CardDescription>
                </div>
                <Switch className="ml-auto" disabled />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2">
                <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <p className="text-[12.5px] text-muted-foreground">
                  TOTP two-factor authentication is coming soon. You&apos;ll be notified when it&apos;s available.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sessions */}
        <motion.div variants={variants.staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Devices where you&apos;re currently signed in.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                <Monitor className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.55} />
                <div className="flex-1">
                  <p className="text-[12.5px] font-medium text-foreground">Current session</p>
                  <p className="text-[11px] text-muted-foreground">This device · Active now</p>
                </div>
                <span className="rounded-full bg-positive/15 px-2 py-0.5 text-[10px] font-semibold text-positive">
                  Current
                </span>
              </div>
              <p className="mt-3 text-[12px] text-muted-foreground">
                Full session management (view all devices, revoke sessions) is coming soon.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Log out */}
        <motion.div variants={variants.staggerItem}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <LogOut className="size-4 text-muted-foreground" strokeWidth={1.55} />
                <div>
                  <CardTitle>Log out</CardTitle>
                  <CardDescription>End your current session on this device.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <p className="text-[12px] text-muted-foreground">
                  Logging out will clear your local session. Your projects and settings are saved and accessible when you sign back in.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowLogoutModal(true)}
                  className="shrink-0 cursor-pointer"
                >
                  Log out
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger zone */}
        <motion.div variants={variants.staggerItem}>
          <Card className="ring-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions for your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Delete account</p>
                  <p className="text-[12px] text-muted-foreground">
                    Permanently delete your account, all projects, and all data. Requires email verification.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="shrink-0 cursor-pointer"
                >
                  Delete account
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showLogoutModal && (
          <LogoutModal onClose={() => setShowLogoutModal(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteModal && (
          <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
