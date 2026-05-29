import fs from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { syncComposerTextarea } from "./sync-composer-textarea";
import { ensureBuildNowStrategy } from "./create-submit-assert";
import { QUEUE_FAILURE_PATH } from "./queue-failure-snapshot";

export const QUEUE_STAGE_MAX_MS = 120_000;

/** Immersive workspace root — never the server fallback shell on /create. */
function immersiveWorkspaceRoot(page: Page) {
  return page
    .locator('[data-testid="builder-shell"]:not([data-create-server-shell="true"])')
    .filter({ has: page.getByTestId("workspace-composer-textarea") })
    .first();
}

export type WorkspaceComposer = {
  layer: ReturnType<Page["locator"]>;
  textarea: ReturnType<Page["locator"]>;
  submit: ReturnType<Page["locator"]>;
  form: ReturnType<Page["locator"]>;
};

export async function openWorkspaceComposer(
  page: Page,
  projectId: string,
): Promise<WorkspaceComposer> {
  const url = `/apps/${projectId}/builder?mode=build`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const chatTab = page.getByRole("button", { name: /^Chat$/i }).first();
  if (await chatTab.isVisible().catch(() => false)) {
    await chatTab.click().catch(() => undefined);
  }
  await page
    .getByTestId("builder-project-loading")
    .waitFor({ state: "hidden", timeout: 60_000 })
    .catch(() => undefined);
  await page
    .getByTestId("builder-project-recovery")
    .waitFor({ state: "hidden", timeout: 5_000 })
    .catch(() => undefined);

  const textarea = page.getByTestId("workspace-composer-textarea").first();
  await textarea.waitFor({ state: "visible", timeout: 75_000 });
  const form = page
    .getByTestId("create-composer-form")
    .filter({ has: textarea })
    .first();
  const submit = form.getByTestId("workspace-composer-submit");
  const layer = immersiveWorkspaceRoot(page);
  return { layer, textarea, submit, form };
}

export async function assertWorkspaceQueueComposerReady(
  page: Page,
  projectId: string,
  composer: WorkspaceComposer,
): Promise<void> {
  const activeId = await composer.form.getAttribute("data-active-project-id");
  if (activeId !== projectId) {
    await failQueueComposerNotReady(page, projectId, composer, {
      reason: "active_project_mismatch",
      activeId,
    });
  }
  await expect(composer.form).toHaveAttribute("data-active-project-id", projectId, {
    timeout: 30_000,
  });
  await expect(composer.form).toHaveAttribute("data-queue-ready", "true", { timeout: 90_000 });
  const buttonText = ((await composer.submit.innerText().catch(() => "")) ?? "").trim();
  if (!/Queue/i.test(buttonText)) {
    await failQueueComposerNotReady(page, projectId, composer, {
      reason: "button_not_queue_mode",
      buttonText,
    });
  }
}

async function waitWorkspaceComposerTextReady(
  composer: WorkspaceComposer,
  expectedText: string,
): Promise<void> {
  if (expectedText.trim().length > 0) {
    await expect(composer.textarea).toHaveValue(expectedText, { timeout: 8_000 });
    return;
  }
  await expect(composer.textarea).toHaveValue("", { timeout: 8_000 });
}

async function failQueueComposerNotReady(
  page: Page,
  projectId: string,
  composer: WorkspaceComposer,
  extra: Record<string, unknown>,
): Promise<never> {
  await writeQueueDiagnostics(page, projectId, composer, {
    stage: "queue_composer_not_ready",
    ...extra,
  });
  throw new Error(`queue_composer_not_ready:${String(extra.reason ?? "unknown")}`);
}

export async function writeQueueDiagnostics(
  page: Page,
  projectId: string,
  composer: WorkspaceComposer,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const screenshot = path.join(
    process.cwd(),
    "tests/e2e/evidence",
    `queue-fail-${Date.now()}.png`,
  );
  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);
  const queueCards = await page
    .locator('[data-testid^="composer-queue-item-"]')
    .allTextContents()
    .catch(() => []);

  const payload = {
    capturedAt: new Date().toISOString(),
    project_id: projectId,
    active_project_id: await composer.form.getAttribute("data-active-project-id"),
    queue_ready: await composer.form.getAttribute("data-queue-ready"),
    queue_count_attr: await composer.form.getAttribute("data-queue-count"),
    queue_disabled_reason: await composer.form.getAttribute("data-queue-disabled-reason"),
    composer_selector:
      '[data-testid="builder-shell"] [data-testid="workspace-composer-textarea"]',
    button_text: (await composer.submit.innerText().catch(() => "")).trim(),
    disabled_reason: await composer.submit.getAttribute("data-disabled-reason"),
    current_queue_count: Number((await composer.form.getAttribute("data-queue-count")) ?? "0"),
    queue_card_texts: queueCards,
    url: page.url(),
    screenshot,
    ...extra,
  };
  fs.mkdirSync(path.dirname(QUEUE_FAILURE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_FAILURE_PATH, JSON.stringify(payload, null, 2));
}

export type QueueEightPlusOneResult = {
  ok: boolean;
  queued: number;
  blockedNine: boolean;
  blockedEmpty: boolean;
  blockedWhitespace: boolean;
  blockedDuplicate: boolean;
};

export async function runQueueEightPlusOneTest(
  page: Page,
  projectId: string,
  composer: WorkspaceComposer,
): Promise<QueueEightPlusOneResult> {
  const deadline = Date.now() + QUEUE_STAGE_MAX_MS;
  const assertTime = () => {
    if (Date.now() > deadline) throw new Error("queue_stage_timeout");
  };

  await syncComposerTextarea(composer.textarea, "");
  await waitWorkspaceComposerTextReady(composer, "");
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("dreamos:composer-sync"));
  });
  await ensureBuildNowStrategy(page).catch(() => undefined);

  const enqueueLine = async (line: string, expectedCount: number) => {
    assertTime();
    await composer.textarea.click();
    await syncComposerTextarea(composer.textarea, line);
    await waitWorkspaceComposerTextReady(composer, line);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dreamos:composer-sync"));
    });
    await expect(composer.form).toHaveAttribute("data-queue-ready", "true", { timeout: 30_000 });
    await composer.textarea.press("Shift+Enter");
    await expect(composer.form).toHaveAttribute("data-queue-count", String(expectedCount), {
      timeout: 20_000,
    });
    if (expectedCount > 0) {
      await expect(page.getByTestId(`composer-queue-item-${expectedCount}`)).toBeVisible({
        timeout: 8_000,
      });
    }
  };

  for (let i = 0; i < 8; i++) {
    await enqueueLine(`Queue item ${i + 1} for inventory app`, i + 1);
  }
  const queued = Number((await composer.form.getAttribute("data-queue-count")) ?? "0");

  await syncComposerTextarea(composer.textarea, "Queue item 9 should block");
  const blockedNine =
    (await composer.form.getAttribute("data-queue-disabled-reason")) === "queue_full" ||
    (await composer.submit.getAttribute("data-disabled-reason")) === "queue_full";
  const countAfterNine = Number((await composer.form.getAttribute("data-queue-count")) ?? "0");

  await syncComposerTextarea(composer.textarea, "");
  await waitWorkspaceComposerTextReady(composer, "");
  const blockedEmpty =
    (await composer.submit.getAttribute("data-disabled-reason")) === "empty" ||
    (await composer.submit.isDisabled().catch(() => true));

  await syncComposerTextarea(composer.textarea, "   ");
  const blockedWhitespace =
    (await composer.submit.getAttribute("data-disabled-reason")) === "empty" ||
    countAfterNine === queued;

  const dupBefore = countAfterNine;
  await syncComposerTextarea(composer.textarea, "Queue item 1 for inventory app");
  await composer.textarea.press("Shift+Enter").catch(() => undefined);
  await page.waitForTimeout(300);
  const countAfterDup = Number((await composer.form.getAttribute("data-queue-count")) ?? "0");
  const blockedDuplicate = countAfterDup === dupBefore;

  const activeAfter = await composer.form.getAttribute("data-active-project-id");
  const sameProject = activeAfter === projectId;

  const result = {
    ok:
      queued === 8 &&
      blockedNine &&
      countAfterNine === 8 &&
      blockedEmpty &&
      blockedWhitespace &&
      blockedDuplicate &&
      sameProject,
    queued,
    blockedNine,
    blockedEmpty,
    blockedWhitespace,
    blockedDuplicate,
  };

  if (!result.ok) {
    await writeQueueDiagnostics(page, projectId, composer, {
      attempted_9th_blocked: blockedNine,
      empty_prompt_blocked: blockedEmpty,
      whitespace_prompt_blocked: blockedWhitespace,
      duplicate_prompt_blocked: blockedDuplicate,
      same_project_preserved: sameProject,
      ninth_count: countAfterNine,
    });
  }

  return result;
}

async function findProjectWithFiles(
  request: APIRequestContext,
  minFiles: number,
): Promise<string | null> {
  const listRes = await request.get("/api/projects");
  if (!listRes.ok()) return null;
  const body = (await listRes.json().catch(() => ({}))) as {
    projects?: Array<{ id?: string }>;
  };
  for (const row of body.projects ?? []) {
    const id = row.id?.trim();
    if (!id) continue;
    const filesRes = await request.get(`/api/projects/${id}/files`);
    if (!filesRes.ok()) continue;
    const filesBody = (await filesRes.json().catch(() => ({}))) as { count?: number };
    if (Number(filesBody.count ?? 0) >= minFiles) return id;
  }
  return null;
}

export async function resolveBuiltProjectForQueue(
  request: APIRequestContext,
): Promise<string | null> {
  const envId = process.env.E2E_QUEUE_PROJECT_ID?.trim();
  if (envId) return envId;

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const id = await findProjectWithFiles(request, 5);
    if (id) return id;
    await new Promise((r) => setTimeout(r, 2_000));
  }
  return null;
}
