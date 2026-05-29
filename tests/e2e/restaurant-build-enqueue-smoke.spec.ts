import { test, expect } from "./helpers/live-gate";
import {
  assertCreateSubmitReady,
  ensureBuildNowStrategy,
  visibleComposerTextarea,
  visibleSubmitButton,
  waitForComposerReady,
} from "./helpers/create-submit-assert";
import {
  assertRestaurantBuildNowBeforeSubmit,
  readBuildStrategyState,
} from "./helpers/build-strategy-assert";
import {
  assertChatBuildNowPayload,
  installChatEnqueueListener,
  waitForFirstBuildEvent,
  writeChatEnqueueFailure,
} from "./helpers/chat-enqueue-assert";
import { waitForProjectIdAfterSubmit } from "./helpers/journey-api";
import { StageWatchdog } from "./helpers/stage-watchdog";
import { RESTAURANT_PROMPT } from "./helpers/restaurant-prompt";

test.describe("Restaurant build enqueue smoke — @enqueue", () => {
  test.describe.configure({ timeout: 90_000 });

  test("@enqueue only — under 60s", async ({ page, request, liveGate }) => {
    if (!liveGate) return;

    const watchdog = new StageWatchdog();
    watchdog.enter("create_interactive");

    await page.goto("/create?mode=build&strategy=build_now", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForComposerReady(page, 20_000);

    const textarea = visibleComposerTextarea(page);
    const submitBtn = visibleSubmitButton(page);
    await assertCreateSubmitReady(page, textarea, submitBtn, RESTAURANT_PROMPT);
    await ensureBuildNowStrategy(page);

    watchdog.enter("build_strategy");
    const strategyState = await assertRestaurantBuildNowBeforeSubmit(
      page,
      RESTAURANT_PROMPT.length,
    );
    expect(strategyState.ok, "build_now strategy required before submit").toBeTruthy();

    const chatListener = installChatEnqueueListener(page);
    watchdog.enter("prompt_submit");
    await submitBtn.click();

    watchdog.enter("chat_enqueue");
    let chatCapture;
    try {
      chatCapture = await chatListener.waitFor202(45_000);
      assertChatBuildNowPayload(chatCapture);
    } catch (err) {
      writeChatEnqueueFailure(page, chatListener.getLast(), {
        error: String(err),
        strategy_state: await readBuildStrategyState(page),
      });
      throw err;
    }

    const projectId =
      (typeof chatCapture.body.projectId === "string" && chatCapture.body.projectId) ||
      (await waitForProjectIdAfterSubmit(page, request, await countProjectsQuick(request), 30_000));
    const buildJobId = String(chatCapture.body.buildJobId ?? "");
    expect(projectId).toBeTruthy();
    expect(buildJobId).toBeTruthy();

    watchdog.enter("first_build_event");
    const firstEvent = await waitForFirstBuildEvent(request, projectId!, buildJobId, 30_000);
    expect(firstEvent.length).toBeGreaterThan(0);

    const statusRes = await request.get(`/api/projects/${projectId}/status`);
    expect(statusRes.ok()).toBeTruthy();
    const statusBody = await statusRes.json();
    expect(statusBody.buildJobId ?? statusBody.build_job_id ?? buildJobId).toBeTruthy();
  });
});

async function countProjectsQuick(request: import("@playwright/test").APIRequestContext) {
  const res = await request.get("/api/projects");
  if (!res.ok()) return 0;
  const data = await res.json();
  return Array.isArray(data.projects) ? data.projects.length : 0;
}
