"use client";

import * as React from "react";
import { VodexBrandIcon } from "@/components/brand/vodex-brand-icon";
import { INTRO_SESSION_KEY } from "@/lib/session/session-intro-decision";

const INTRO_MS = 2800;
const LETTERS = "VODEX".split("");

export function VodexSessionIntro({
  show,
  onDone,
  onVisible,
}: {
  show: boolean;
  onDone: () => void;
  /** Called once when overlay is actually shown — safe place to mark session seen. */
  onVisible?: () => void;
}) {
  const [phase, setPhase] = React.useState<"hidden" | "enter" | "hold" | "exit">("hidden");
  const doneRef = React.useRef(false);
  const visibleReported = React.useRef(false);

  const finish = React.useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase("hidden");
    onDone();
  }, [onDone]);

  React.useEffect(() => {
    if (!show) {
      setPhase("hidden");
      visibleReported.current = false;
      return;
    }
    doneRef.current = false;
    setPhase("enter");
    if (!visibleReported.current) {
      visibleReported.current = true;
      onVisible?.();
    }
    const hold = window.setTimeout(() => setPhase("hold"), 80);
    const exitAt = window.setTimeout(() => setPhase("exit"), INTRO_MS - 520);
    const doneAt = window.setTimeout(finish, INTRO_MS);
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(exitAt);
      window.clearTimeout(doneAt);
    };
  }, [show, finish, onVisible]);

  if (phase === "hidden") return null;

  const exiting = phase === "exit";

  return (
    <div
      className={`vodex-premium-intro fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#05060a] ${exiting ? "vodex-premium-intro--exit" : ""}`}
      data-testid="vodex-session-intro"
      role="status"
      aria-live="polite"
      aria-label="Loading Vodex"
    >
      <div className="vodex-premium-intro__bg" aria-hidden />
      <div className="vodex-premium-intro__aura vodex-premium-intro__aura--a" aria-hidden />
      <div className="vodex-premium-intro__aura vodex-premium-intro__aura--b" aria-hidden />
      <div className="vodex-premium-intro__ring vodex-premium-intro__ring--outer" aria-hidden />
      <div className="vodex-premium-intro__ring vodex-premium-intro__ring--inner" aria-hidden />

      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
        <div className="vodex-premium-intro__icon-wrap relative flex size-24 items-center justify-center">
          <VodexBrandIcon size="xl" alt="" className="vodex-premium-intro__icon relative size-20" />
        </div>

        <div className="flex items-center justify-center gap-[0.35em]" aria-hidden>
          {LETTERS.map((ch, i) => (
            <span
              key={ch + i}
              className="vodex-premium-intro__letter text-2xl font-semibold tracking-[0.2em] text-white"
              style={{ animationDelay: `${120 + i * 70}ms` }}
            >
              {ch}
            </span>
          ))}
        </div>
        <p className="vodex-premium-intro__tagline text-[13px] font-medium tracking-wide text-white/70">
          Preparing your workspace
        </p>
      </div>
    </div>
  );
}

/** @deprecated use decideSessionIntro in gate */
export function shouldShowSessionIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markSessionIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INTRO_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}
