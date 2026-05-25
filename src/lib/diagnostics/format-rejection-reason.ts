/** Turn unknown rejection reasons (incl. DOM Event) into a readable string. */
export function formatRejectionReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message || reason.name || "Error";
  if (typeof reason === "string") return reason;
  if (reason == null) return "Unknown rejection";

  if (typeof reason === "object") {
    const eventLike = reason as {
      type?: string;
      message?: string;
      error?: unknown;
      reason?: unknown;
    };

    if (eventLike.error instanceof Error) {
      return eventLike.error.message || eventLike.error.name;
    }
    if (typeof eventLike.message === "string" && eventLike.message.length > 0) {
      return eventLike.message;
    }
    if (typeof eventLike.type === "string" && eventLike.type.length > 0) {
      return eventLike.type;
    }
    if (eventLike.reason != null && eventLike.reason !== reason) {
      return formatRejectionReason(eventLike.reason);
    }
  }

  try {
    const json = JSON.stringify(reason);
    if (json && json !== "{}") return json;
  } catch {
    /* circular */
  }

  return Object.prototype.toString.call(reason);
}

export function isDomEventRejection(reason: unknown): boolean {
  return (
    typeof Event !== "undefined" &&
    reason instanceof Event &&
    !(reason instanceof Error)
  );
}
