/** Dev-only structured logs for send/submit pipelines (never logs secrets). */
export function submitDebug(
  channel: "chat" | "create",
  step: string,
  detail?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") return;
  if (detail && Object.keys(detail).length > 0) {
    console.info(`[${channel}] ${step}`, detail);
  } else {
    console.info(`[${channel}] ${step}`);
  }
}
