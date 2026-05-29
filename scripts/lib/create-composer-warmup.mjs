#!/usr/bin/env node
/**
 * Playwright warm-up: /create?mode=build must show builder-shell within 20s.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { ROOT, getBaseUrl } from "./e2e-live.mjs";

const base = getBaseUrl();
const SHELL_TIMEOUT_MS = 20_000;
const COMPOSER_TIMEOUT_MS = 60_000;

const FAILURE_JSON = path.join(ROOT, "tests/e2e/evidence/create-shell-failure.json");
const DEV_LOG = path.join(ROOT, "tests/e2e/evidence/restaurant-dev-server.log");

function tailLog(n = 50) {
  try {
    if (!fs.existsSync(DEV_LOG)) return [];
    return fs.readFileSync(DEV_LOG, "utf8").split(/\r?\n/).slice(-n).filter(Boolean);
  } catch {
    return [];
  }
}

async function writeShellFailure(page, label, extra = {}) {
  fs.mkdirSync(path.dirname(FAILURE_JSON), { recursive: true });
  const screenshot = path.join(ROOT, "tests/e2e/evidence", `create-shell-fail-${Date.now()}.png`);
  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);
  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000) ?? "").catch(() => "");
  const flags = await page
    .evaluate(() => ({
      builderShell: Boolean(document.querySelector('[data-testid="builder-shell"]')),
      textarea: Boolean(document.querySelector('[data-testid="create-prompt-textarea"]')),
      onboarding: location.pathname.includes("/onboarding"),
      signIn: location.pathname.includes("/auth/login"),
    }))
    .catch(() => ({}));

  const payload = {
    capturedAt: new Date().toISOString(),
    label,
    url: page.url(),
    title: await page.title().catch(() => ""),
    bodyTextFirst2000: bodyText,
    flags,
    serverLogTail: tailLog(50),
    screenshot,
    ...extra,
  };
  fs.writeFileSync(FAILURE_JSON, JSON.stringify(payload, null, 2));
  return { payload, screenshot };
}

export async function warmCreateComposerPage() {
  const authPath = path.join(ROOT, ".playwright-auth.json");
  if (!fs.existsSync(authPath)) {
    return { ok: false, error: "missing .playwright-auth.json" };
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: authPath,
    baseURL: base,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const start = Date.now();

  try {
    await page.goto("/create?mode=build", { waitUntil: "domcontentloaded", timeout: 60_000 });

    if (page.url().includes("/auth/login")) {
      return { ok: false, error: "redirected_to_login" };
    }

    const shellDeadline = Date.now() + SHELL_TIMEOUT_MS;
    while (Date.now() < shellDeadline) {
      const visible = await page
        .locator('[data-testid="builder-shell"]')
        .first()
        .isVisible()
        .catch(() => false);
      if (visible) break;
      await page.waitForTimeout(150);
    }

    const shellVisible = await page
      .locator('[data-testid="builder-shell"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (!shellVisible) {
      const { payload } = await writeShellFailure(page, "CREATE_SHELL_NOT_VISIBLE");
      return {
        ok: false,
        error: "CREATE_SHELL_NOT_VISIBLE",
        elapsedMs: Date.now() - start,
        diagnostics: FAILURE_JSON,
        reason: payload.flags,
      };
    }

    const shellMs = Date.now() - start;

    const composerDeadline = Date.now() + COMPOSER_TIMEOUT_MS;
    let usedFallback = false;
    let reason = "server_shell";

    while (Date.now() < composerDeadline) {
      const probe = await page.evaluate(() => {
        const ta = document.getElementById("dreamos-composer-prompt");
        const btn = document.querySelector('[data-testid="create-submit-button"]');
        const marker = document.querySelector('[data-testid="create-composer-ready"]');
        if (!(ta instanceof HTMLTextAreaElement) || !(btn instanceof HTMLButtonElement)) {
          return { ok: false, reason: "dom_missing" };
        }
        const rect = ta.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return { ok: false, reason: "textarea_not_visible" };
        if (marker?.getAttribute("data-ready") === "true") {
          return { ok: true, reason: marker.getAttribute("data-reason") ?? "ready" };
        }
        if (
          btn.hasAttribute("data-disabled-reason") &&
          btn.hasAttribute("data-dom-len") &&
          !ta.disabled
        ) {
          return { ok: true, reason: "typing_fallback" };
        }
        return { ok: false, reason: marker?.getAttribute("data-reason") ?? "pending" };
      });
      if (probe.ok) {
        usedFallback = probe.reason !== "ready";
        reason = probe.reason ?? "ready";
        break;
      }
      reason = probe.reason;
      await page.waitForTimeout(250);
    }

    if (Date.now() >= composerDeadline) {
      await writeShellFailure(page, "composer_not_ready_after_shell", { shellVisibleMs: shellMs });
      return {
        ok: false,
        error: "composer_not_ready",
        elapsedMs: Date.now() - start,
        shellMs,
        diagnostics: FAILURE_JSON,
      };
    }

    const canType = await page.evaluate(() => {
      const ta = document.getElementById("dreamos-composer-prompt");
      if (!(ta instanceof HTMLTextAreaElement) || ta.disabled) return false;
      ta.focus();
      ta.value = "ping";
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      return ta.value === "ping";
    });

    if (!canType) {
      await writeShellFailure(page, "textarea_not_accepting_text");
      return { ok: false, error: "textarea_not_accepting_text", diagnostics: FAILURE_JSON };
    }

    return {
      ok: true,
      elapsedMs: Date.now() - start,
      shellMs,
      usedFallback,
      reason,
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const result = await warmCreateComposerPage();
  if (!result.ok) {
    console.error("✗ create warm-up failed", result);
    process.exit(1);
  }
  console.log(
    `✓ create warm-up shell=${result.shellMs}ms total=${result.elapsedMs}ms fallback=${result.usedFallback} reason=${result.reason}`,
  );
}
