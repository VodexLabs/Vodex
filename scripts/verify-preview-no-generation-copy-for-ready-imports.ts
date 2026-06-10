#!/usr/bin/env npx tsx
/** P1.3.37 — ready imported ZIP never shows generation continuing copy. */
import { resolvePreviewState } from "../src/lib/preview/resolve-preview-state";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const meta = {
  source: "zip_import",
  import: { file_count: 1353 },
  preview_renderable: true,
  preview_honest: true,
  preview_job_id: "job-1",
  preview_artifact_path: "proj/job-1",
};

const state = resolvePreviewState({
  projectMetadata: meta,
  projectFileCount: 0,
  legacyCanPreview: false,
  thinking: true,
  iframeSrc: "/preview-runtime/p/job-1",
  urlResolution: {
    artifactId: "job-1",
    normalizedPreviewUrl: "/preview-runtime/p/job-1",
    iframeSrc: "/preview-runtime/p/job-1",
    source: "rebuilt_canonical",
    route: "/",
    selectedPreviewUrl: null,
    cacheBust: null,
    wasNormalized: false,
    wasRejected: false,
    rejectReason: null,
    candidates: [],
  },
});

assert(state.state === "ready", `state=${state.state}`);
assert(state.showGenerationContinuingCopy === false, "no generation copy for ready import");

const ai = resolvePreviewState({
  projectMetadata: {},
  projectFileCount: 0,
  legacyCanPreview: false,
  runtimeStatus: {
    jobStatus: "running",
    previewRenderable: false,
    previewStatus: "building",
  } as never,
});

assert(
  ai.state === "ai_generation_incomplete" || ai.state === "building",
  `AI incomplete state=${ai.state}`,
);
assert(ai.showGenerationContinuingCopy === true, "AI incomplete still shows generation copy");

console.log("✓ verify:preview-no-generation-copy-for-ready-imports");
