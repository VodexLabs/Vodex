"use client";

/** Dev-only status line under chat/create composers — hidden in production. */
export function ComposerDebugStrip({
  channel,
  inputLen,
  mode,
  disabledReason,
  tokensStatus,
  lastSubmitAt,
  lastApiStatus,
}: {
  channel: "chat" | "create";
  inputLen: number;
  mode?: string;
  disabledReason: string | null;
  tokensStatus: string;
  lastSubmitAt: number | null;
  lastApiStatus: string | null;
}) {
  if (process.env.NODE_ENV === "production") return null;

  const submitTs = lastSubmitAt ? new Date(lastSubmitAt).toISOString().slice(11, 19) : "—";

  return (
    <p
      className="mt-1 font-mono text-[9px] leading-relaxed text-muted-foreground/75"
      data-composer-debug={channel}
    >
      [{channel}] len={inputLen}
      {mode ? ` · mode=${mode}` : ""} · disabled={disabledReason ?? "no"} · tokens={tokensStatus} ·
      submit@{submitTs} · api={lastApiStatus ?? "—"}
    </p>
  );
}
