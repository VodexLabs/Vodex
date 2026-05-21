import { logAuthEvent } from "@/lib/auth/auth-diagnostics";

export type PostLoginResult =
  | { ok: true }
  | { ok: false; message: string; code?: string };

/** Ensures workspace profile exists after password or OAuth session is established. */
export async function ensureProfileAfterLogin(): Promise<PostLoginResult> {
  logAuthEvent("profile_ensure_started");
  try {
    const res = await fetch("/api/profile/ensure", {
      method: "POST",
      credentials: "include",
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      hint?: string;
    };
    if (!res.ok) {
      logAuthEvent(
        "profile_ensure_failed",
        { status: res.status, code: body.code, hint: body.hint?.slice(0, 120) },
        "error",
      );
      return {
        ok: false,
        message:
          "Login succeeded, but workspace setup failed. Please refresh or contact support.",
        code: body.code,
      };
    }
    logAuthEvent("profile_ensure_succeeded");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "network";
    logAuthEvent("profile_ensure_failed", { reason: msg }, "error");
    return {
      ok: false,
      message:
        "Login succeeded, but workspace setup failed. Please refresh or contact support.",
      code: "network",
    };
  }
}
