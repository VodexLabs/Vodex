/**
 * Static analysis of imported/generated source for mobile / store readiness.
 * No fake results — only rules applied to file paths and contents.
 */

export type ReadinessSeverity = "error" | "warning" | "info";

export type ReadinessIssue = {
  id: string;
  severity: ReadinessSeverity;
  title: string;
  detail: string;
};

const BROWSER_ONLY = [
  /\bwindow\.location\b/i,
  /\blocalStorage\b/i,
  /\bsessionStorage\b/i,
  /\bnavigator\.share\b/i,
  /\bdocument\.cookie\b/i,
  /\bwebkit\b/i,
];

export function scanAppSourceForReadiness(files: Array<{ path: string; content: string }>): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  const paths = new Set(files.map((f) => f.path.toLowerCase()));
  const combined = files.map((f) => `${f.path}\n${f.content}`).join("\n");

  const hasPrivacy =
    [...paths].some(
      (p) =>
        p.includes("privacy") ||
        p.includes("policy") ||
        p.endsWith("privacy.md") ||
        p.endsWith("privacy-policy.html"),
    ) || /privacy\s+policy/i.test(combined);

  if (!hasPrivacy) {
    issues.push({
      id: "privacy",
      severity: "warning",
      title: "Privacy policy",
      detail: "No privacy policy page or markdown detected. Stores require a visible privacy policy URL.",
    });
  }

  const hasAppIcon =
    paths.has("public/favicon.ico") ||
    [...paths].some((p) => p.includes("icon") && (p.endsWith(".png") || p.endsWith(".svg"))) ||
    /app\/icon\.(tsx|ts|jsx|js)/.test([...paths].join(" "));

  if (!hasAppIcon) {
    issues.push({
      id: "icon",
      severity: "warning",
      title: "App icon",
      detail: "No favicon / app icon files detected under common paths (e.g. public/, app/icon).",
    });
  }

  if (/password|sign\s*in|login|auth\.sign/i.test(combined) && !/supabase\.auth|next-auth|clerk/i.test(combined)) {
    issues.push({
      id: "auth",
      severity: "info",
      title: "Authentication",
      detail: "Login or password flows detected but no obvious Supabase Auth / NextAuth / Clerk integration in scanned files. Verify server-side session handling for mobile.",
    });
  }

  for (const re of BROWSER_ONLY) {
    if (re.test(combined)) {
      issues.push({
        id: "browser-api",
        severity: "warning",
        title: "Browser-only APIs",
        detail: `Pattern ${re.source} may not exist in native WebViews without shims.`,
      });
      break;
    }
  }

  if (/https?:\/\//i.test(combined)) {
    issues.push({
      id: "external-links",
      severity: "info",
      title: "External links",
      detail: "Hard-coded external URLs found — store review may require disclosure of outbound data flows.",
    });
  }

  if (/geolocation|navigator\.geolocation|camera|microphone|notifications\.requestPermission/i.test(combined)) {
    issues.push({
      id: "permissions",
      severity: "warning",
      title: "Sensitive permissions",
      detail: "Location, camera, microphone, or notification permission calls may require explicit Play/App Store declarations.",
    });
  }

  issues.push({
    id: "metadata",
    severity: "info",
    title: "Store metadata",
    detail: "Prepare short description, keywords, screenshots, and content rating questionnaires before submission.",
  });

  const hasPkg = [...paths].some((p) => p === "package.json");
  if (hasPkg) {
    const pkg = files.find((f) => f.path === "package.json");
    if (pkg) {
      try {
        const j = JSON.parse(pkg.content) as { name?: string };
        if (!j.name || j.name === "dreamos-imported-app") {
          issues.push({
            id: "package-name",
            severity: "info",
            title: "Package name",
            detail: "Set a stable npm `name` — some exporters use it to suggest Android applicationId / namespace.",
          });
        }
      } catch {
        /* ignore */
      }
    }
  } else {
    issues.push({
      id: "package-json",
      severity: "warning",
      title: "Package / bundle id",
      detail: "No package.json at repo root — cannot infer Android applicationId or iOS bundle identifier from this tree.",
    });
  }

  return issues;
}
