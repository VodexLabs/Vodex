#!/usr/bin/env npx tsx
/** P1.3.37 — hard ready invariant overrides thinking/buildActive for imported ZIP. */
import { resolvePreviewState } from "../src/lib/preview/resolve-preview-state";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const importedMeta = {
  source: "zip_import",
  import: { file_count: 1353 },
  preview_renderable: true,
  preview_honest: true,
  preview_job_id: "267e0278-d333-41e8-82ef-f8c309749df8",
  preview_artifact_path: "30066b29/267e0278-d333-41e8-82ef-f8c309749df8",
};

const ready = resolvePreviewState({
  projectMetadata: importedMeta,
  projectFileCount: 0,
  thinking: true,
  buildActive: true,
  legacyCanPreview: false,
  runtimeStatus: null,
  iframeSrc: "https://vodex.dev/preview-runtime/30066b29/267e0278/",
  urlResolution: {
    source: "rebuilt_canonical",
    normalizedPreviewUrl: "/preview-runtime/30066b29/267e0278/",
    iframeSrc: "https://vodex.dev/preview-runtime/30066b29/267e0278/",
    artifactId: "267e0278-d333-41e8-82ef-f8c309749df8",
    route: "/",
    selectedPreviewUrl: null,
    cacheBust: null,
    wasNormalized: true,
    wasRejected: false,
    rejectReason: null,
    candidates: [],
  },
});

assert(ready.state === "ready", `expected ready, got ${ready.state}`);
assert(ready.showIframe === true, "showIframe must be true");
assert(ready.showBuildingShell === false, "no build shell");
assert(ready.showGenerationContinuingCopy === false, "no generation copy");
assert(ready.sourceOfTruth === "imported_hard_ready_invariant", ready.sourceOfTruth);

console.log("✓ verify:preview-ready-overrides-thinking-for-imports");
