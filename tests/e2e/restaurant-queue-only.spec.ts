import { test, expect } from "./helpers/live-gate";
import {
  assertWorkspaceQueueComposerReady,
  openWorkspaceComposer,
  resolveBuiltProjectForQueue,
  runQueueEightPlusOneTest,
  QUEUE_STAGE_MAX_MS,
  writeQueueDiagnostics,
} from "./helpers/queue-workspace";

test.describe("Restaurant queue only — @queue", () => {
  test("@queue workspace composer 8+1 under 90s", async ({ page, request }) => {
    test.setTimeout(QUEUE_STAGE_MAX_MS + 15_000);

    const projectId = await resolveBuiltProjectForQueue(request);
    if (!projectId) {
      throw new Error("queue_only:no_built_project — run a build first or set E2E_QUEUE_PROJECT_ID");
    }

    const composer = await openWorkspaceComposer(page, projectId);
    await assertWorkspaceQueueComposerReady(page, projectId, composer);

    const result = await runQueueEightPlusOneTest(page, projectId, composer);
    expect(
      result.ok,
      `queue 8+1 failed: queued=${result.queued} nine=${result.blockedNine} empty=${result.blockedEmpty} ws=${result.blockedWhitespace} dup=${result.blockedDuplicate}`,
    ).toBeTruthy();
  });
});
