"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { selectCls, textareaCls } from "@/components/settings/shared";
import { useAuthStore } from "@/lib/stores/auth-store";
import { resolveAccountEmail } from "@/lib/auth/client-identity";
import { resolveDisplayName } from "@/lib/profile-display";
import { cn } from "@/lib/utils";

const REASONS = [
  "Sales",
  "Support",
  "Billing",
  "Partnership",
  "Product feedback",
  "Other",
] as const;

type Reason = (typeof REASONS)[number];

export function ContactForm() {
  const searchParams = useSearchParams();
  const { profile, user } = useAuthStore();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [reason, setReason] = React.useState<Reason>("Support");
  const [planInterest, setPlanInterest] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const display = resolveDisplayName(profile, user);
    if (display && display !== "User") setName(display);
    const em = resolveAccountEmail(user, profile);
    if (em) setEmail(em);
    if (profile?.workspace_name) setCompany(profile.workspace_name);
  }, [profile, user]);

  React.useEffect(() => {
    const r = searchParams.get("reason");
    if (r && REASONS.includes(r as Reason)) setReason(r as Reason);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!trimmedMessage) {
      setError("Please enter a message.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          company: company.trim() || null,
          reason,
          message: trimmedMessage,
          plan_interest: planInterest.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
      if (!res.ok) {
        const detail = data.hint ? `${data.error ?? "Submit failed"} — ${data.hint}` : (data.error ?? "Submit failed");
        throw new Error(detail);
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg rounded-2xl border border-positive/30 bg-positive/5 p-8 text-center ring-1 ring-positive/20"
      >
        <CheckCircle2 className="mx-auto size-10 text-positive" strokeWidth={1.5} />
        <p className="mt-4 text-[16px] font-semibold text-foreground">
          Thanks — we received your message and will get back to you.
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          We typically respond within one business day.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className={cn(
        "mx-auto max-w-lg rounded-2xl border border-accent/20 bg-gradient-to-b from-accent/[0.06] to-background p-6 shadow-[0_24px_64px_-28px_rgba(30,107,255,0.25)] ring-1 ring-border/80 sm:p-8",
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className="text-[12px] font-medium text-foreground">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" required />
        </label>
        <label className="block sm:col-span-1">
          <span className="text-[12px] font-medium text-foreground">Email</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5"
            required
            autoComplete="email"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-[12px] font-medium text-foreground">
          Company / workspace <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <Input value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1.5" />
      </label>

      <label className="mt-4 block">
        <span className="text-[12px] font-medium text-foreground">Reason</span>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as Reason)}
          className={cn(selectCls, "mt-1.5 w-full")}
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block">
        <span className="text-[12px] font-medium text-foreground">
          Plan interest <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <Input
          value={planInterest}
          onChange={(e) => setPlanInterest(e.target.value)}
          placeholder="e.g. Pro, Infinity, custom"
          className="mt-1.5"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-[12px] font-medium text-foreground">Message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
          className={cn(textareaCls, "mt-1.5 w-full resize-y")}
          placeholder="Tell us what you're building or what you need help with…"
        />
      </label>

      {error ? <p className="mt-4 text-[12px] text-destructive">{error}</p> : null}

      <Button type="submit" variant="accent" size="lg" className="mt-6 w-full gap-2" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send message"
        )}
      </Button>
    </motion.form>
  );
}
