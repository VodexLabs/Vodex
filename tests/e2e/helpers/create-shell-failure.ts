import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext, Page } from "@playwright/test";

export const CREATE_SHELL_FAILURE_PATH = path.join(
  process.cwd(),
  "tests/e2e/evidence/create-shell-failure.json",
);

const DEV_LOG = path.join(process.cwd(), "tests/e2e/evidence/restaurant-dev-server.log");

function tailLines(filePath: string, maxLines: number): string[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    return lines.slice(-maxLines).filter(Boolean);
  } catch {
    return [];
  }
}

export async function captureCreateShellFailure(
  page: Page,
  request: APIRequestContext,
  input: { label: string; redirectHistory?: string[] },
): Promise<string> {
  fs.mkdirSync(path.dirname(CREATE_SHELL_FAILURE_PATH), { recursive: true });
  const screenshot = path.join(
    process.cwd(),
    "tests/e2e/evidence",
    `create-shell-fail-${Date.now()}.png`,
  );
  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);

  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000) ?? "");
  const htmlSnippet = await page.evaluate(
    () => document.getElementById("create-page-root")?.outerHTML?.slice(0, 4000) ?? document.body?.innerHTML?.slice(0, 4000) ?? "",
  );

  const flags = await page.evaluate(() => ({
    builderShell: Boolean(document.querySelector('[data-testid="builder-shell"]')),
    textarea: Boolean(document.querySelector('[data-testid="create-prompt-textarea"]')),
    onboarding: document.body?.innerText?.toLowerCase().includes("onboarding") ?? false,
    signIn: document.body?.innerText?.toLowerCase().includes("sign in") ?? false,
    loading: Boolean(
      document.querySelector('[data-testid="create-bootstrap-loading"]') ||
        document.body?.innerText?.toLowerCase().includes("loading"),
    ),
    error: Boolean(document.querySelector('[data-testid="create-bootstrap-error"]')),
  }));

  const consoleErrors: string[] = [];
  const networkFailures: string[] = [];
  const failedChunks: string[] = [];

  const authCheck = await request.get("/api/dev/auth-session-check").catch(() => null);
  const credits = await request.get("/api/credits").catch(() => null);

  const dreamosAuth = await page
    .evaluate(() => {
      const raw = localStorage.getItem("dreamos-auth");
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { state?: { profile?: Record<string, unknown> } };
        if (parsed?.state?.profile) {
          parsed.state.profile = {
            id: parsed.state.profile.id,
            email: parsed.state.profile.email,
            onboarding_completed: parsed.state.profile.onboarding_completed,
          };
        }
        return JSON.stringify(parsed);
      } catch {
        return "[unparseable]";
      }
    })
    .catch(() => null);

  const payload = {
    capturedAt: new Date().toISOString(),
    label: input.label,
    url: page.url(),
    title: await page.title().catch(() => ""),
    bodyTextFirst2000: bodyText,
    htmlSnippet,
    flags,
    consoleErrors,
    networkFailures,
    failedJsChunks: failedChunks,
    redirectHistory: input.redirectHistory ?? [],
    serverLogTail: tailLines(DEV_LOG, 50),
    dreamosAuthRedacted: dreamosAuth,
    authSessionCheck: authCheck?.ok() ? await authCheck.json().catch(() => null) : authCheck?.status(),
    creditsStatus: credits?.status() ?? null,
    screenshot,
  };

  fs.writeFileSync(CREATE_SHELL_FAILURE_PATH, JSON.stringify(payload, null, 2));
  console.error("[create-shell-failure]", payload.label, CREATE_SHELL_FAILURE_PATH);
  return CREATE_SHELL_FAILURE_PATH;
}

export async function waitForBuilderShell(
  page: Page,
  request: APIRequestContext,
  timeoutMs = 20_000,
): Promise<{ ok: boolean; elapsedMs: number }> {
  const start = Date.now();
  const redirects: string[] = [page.url()];

  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    if (redirects[redirects.length - 1] !== url) redirects.push(url);

    const visible = await page
      .locator('[data-testid="builder-shell"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (visible) {
      return { ok: true, elapsedMs: Date.now() - start };
    }
    await page.waitForTimeout(200);
  }

  await captureCreateShellFailure(page, request, {
    label: "CREATE_SHELL_NOT_VISIBLE",
    redirectHistory: redirects,
  });
  return { ok: false, elapsedMs: Date.now() - start };
}
