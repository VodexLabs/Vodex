"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { dreamosLog } from "@/lib/diagnostics/dreamos-logger";
import {
  formatRejectionReason,
  isDomEventRejection,
} from "@/lib/diagnostics/format-rejection-reason";
import { isDreamosOwnerEmail } from "@/lib/admin-owner";
import { useAuthStore } from "@/lib/stores/auth-store";

export function scanDomWiringIssues(): Array<{ message: string; metadata: Record<string, unknown> }> {
  if (typeof document === "undefined") return [];
  const issues: Array<{ message: string; metadata: Record<string, unknown> }> = [];

  document.querySelectorAll("button").forEach((el, i) => {
    const id = el.id || null;
    const hasHandler =
      el.hasAttribute("onclick") ||
      el.getAttribute("type") === "submit" ||
      el.getAttribute("type") === "button" ||
      el.hasAttribute("aria-label") ||
      el.hasAttribute("aria-hidden") ||
      el.closest("form") !== null;
    if (!hasHandler && !el.disabled && el.getAttribute("type") !== "button") {
      issues.push({
        message: "Button may have no click handler",
        metadata: { index: i, id, text: el.textContent?.trim().slice(0, 40) },
      });
    }
  });

  document.querySelectorAll("form").forEach((form, i) => {
    const hasSubmit =
      form.querySelector('[type="submit"]') !== null ||
      form.getAttribute("action") !== null;
    if (!hasSubmit) {
      issues.push({
        message: "Form may lack submit handler",
        metadata: { index: i, id: form.id || null },
      });
    }
  });

  return issues.slice(0, 25);
}

/** Global client error capture + optional DOM wiring scan for owner diagnostics. */
export function DiagnosticsBootstrap() {
  const pathname = usePathname();
  const email = useAuthStore((s) => s.profile?.email);
  const isOwner = isDreamosOwnerEmail(email);

  React.useEffect(() => {
    const onError = (event: ErrorEvent) => {
      dreamosLog({
        source: "client",
        category: "frontend_error",
        severity: "error",
        route: pathname,
        message: event.message || "Uncaught error",
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const msg = formatRejectionReason(event.reason);
      dreamosLog({
        source: "client",
        category: "frontend_error",
        severity: "error",
        route: pathname,
        message: `Unhandled rejection: ${msg}`,
        metadata: {
          reasonType: event.reason == null ? "null" : Object.prototype.toString.call(event.reason),
        },
      });
      // DOM Event rejections (e.g. script/load failures) are not actionable in dev overlay.
      if (isDomEventRejection(event.reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [pathname]);

  React.useEffect(() => {
    if (!isOwner) return;
    const issues = scanDomWiringIssues();
    for (const issue of issues) {
      dreamosLog({
        source: "client",
        category: "dom_wiring",
        severity: "warn",
        route: pathname,
        message: issue.message,
        metadata: issue.metadata,
      });
    }
  }, [isOwner, pathname]);

  return null;
}
