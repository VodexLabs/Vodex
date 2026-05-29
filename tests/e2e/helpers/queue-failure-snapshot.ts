import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { visibleComposerTextarea, visibleSubmitButton } from "./create-submit-assert";

export const QUEUE_FAILURE_PATH = path.join(
  process.cwd(),
  "tests/e2e/evidence/queue-failure.json",
);

export async function writeQueueFailureSnapshot(
  page: Page,
  projectId: string,
  input: {
    queuedCount: number;
    blockedNine: boolean;
    blockedEmpty: boolean;
    blockedDuplicate: boolean;
    consoleErrors: string[];
    networkErrors: string[];
  },
): Promise<void> {
  const textarea = visibleComposerTextarea(page);
  const submitBtn = visibleSubmitButton(page);
  const disabledReason = await submitBtn.getAttribute("data-disabled-reason").catch(() => null);
  const queueCards = await page
    .getByTestId("composer-prompt-queue")
    .locator("li")
    .allTextContents()
    .catch(() => []);

  const snapshot = {
    capturedAt: new Date().toISOString(),
    project_id: projectId,
    current_queue_count: input.queuedCount,
    queue_card_texts: queueCards,
    attempted_9th_blocked: input.blockedNine,
    empty_prompt_blocked: input.blockedEmpty,
    duplicate_prompt_blocked: input.blockedDuplicate,
    button_disabled: await submitBtn.isDisabled().catch(() => null),
    disabled_reason: disabledReason,
    composer_value_length: (await textarea.inputValue().catch(() => "")).length,
    console_errors: input.consoleErrors.slice(0, 15),
    network_failures: input.networkErrors.slice(0, 15),
  };

  fs.mkdirSync(path.dirname(QUEUE_FAILURE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_FAILURE_PATH, JSON.stringify(snapshot, null, 2));
}
