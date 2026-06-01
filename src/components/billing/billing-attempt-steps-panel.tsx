"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Circle, Loader2, MinusCircle } from "lucide-react";
import type { BillingAttemptStep, AttemptStepStatus } from "@/lib/billing/billing-attempt-steps";

type Props = {
  attemptId: string | null;
  steps?: BillingAttemptStep[] | null;
  apiError?: string | null;
  lastResponse?: Record<string, unknown> | null;
  pollAttemptId?: string | null;
};

function StepIcon({ status }: { status: AttemptStepStatus }) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />;
    case "failed":
      return <AlertCircle className="size-4 text-destructive shrink-0" />;
    case "skipped":
      return <MinusCircle className="size-4 text-muted-foreground shrink-0" />;
    case "pending":
      return <Loader2 className="size-4 animate-spin text-accent shrink-0" />;
    default:
      return <Circle className="size-4 text-muted-foreground shrink-0" />;
  }
}

export function BillingAttemptStepsPanel({
  attemptId,
  steps: initialSteps,
  apiError,
  lastResponse,
  pollAttemptId,
}: Props) {
  const [steps, setSteps] = React.useState<BillingAttemptStep[] | null>(initialSteps ?? null);

  React.useEffect(() => {
    setSteps(initialSteps ?? null);
  }, [initialSteps]);

  const pollId = pollAttemptId ?? attemptId;

  React.useEffect(() => {
    if (!pollId) return;
    let cancelled = false;
    const poll = async () => {
      const res = await fetch(`/api/billing/status?attemptId=${encodeURIComponent(pollId)}`, {
        credentials: "include",
      });
      const json = (await res.json()) as { attemptSteps?: BillingAttemptStep[]; upgradeComplete?: boolean };
      if (cancelled) return;
      if (json.attemptSteps) setSteps(json.attemptSteps);
      if (json.upgradeComplete) return;
      window.setTimeout(() => void poll(), 2500);
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [pollId]);

  if (!attemptId && !steps?.length) return null;

  return (
    <section className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <h3 className="text-[14px] font-semibold">Billing attempt status</h3>
      {attemptId ? (
        <p className="text-[11px] font-mono text-muted-foreground break-all">{attemptId}</p>
      ) : null}

      {apiError ? (
        <p className="text-[12px] text-destructive rounded-lg bg-destructive/10 px-3 py-2">{apiError}</p>
      ) : null}

      {lastResponse && !lastResponse.ok && lastResponse.error ? (
        <pre className="text-[11px] overflow-auto rounded bg-black/30 p-2 text-destructive">
          {JSON.stringify(lastResponse, null, 2)}
        </pre>
      ) : null}

      <ol className="space-y-2">
        {(steps ?? []).map((s, i) => (
          <li key={s.id} className="flex gap-2 text-[12px]">
            <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
            <StepIcon status={s.status} />
            <div className="min-w-0 flex-1">
              <span className={s.status === "failed" ? "text-destructive font-medium" : ""}>
                {s.label}
              </span>
              <span className="ml-2 text-[10px] uppercase font-mono text-muted-foreground">
                {s.status}
              </span>
              {s.reason ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground break-words">{s.reason}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {!steps?.length ? (
        <p className="text-[12px] text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Initializing attempt trace…
        </p>
      ) : null}
    </section>
  );
}
