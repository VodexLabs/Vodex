#!/usr/bin/env npx tsx
/** P1.3.39 — prehydration must rewrite iframe URL to / before Next boots. */
import { buildPrehydrationLocationRewriteScript } from "../src/lib/preview/inject-preview-prehydration-location-rewrite";
import { rewritePreviewArtifactHtml } from "../src/lib/preview/rewrite-preview-artifact-html";

const script = buildPrehydrationLocationRewriteScript("/");
if (!script.includes("history.replaceState") || !script.includes("LOCK='/'")) {
  throw new Error("prehydration missing replaceState to /");
}

const html = rewritePreviewArtifactHtml(
  "<!DOCTYPE html><html><head></head><body></body></html>",
  "30066b29-15fa-41cf-9a6e-4111418be3e5",
  "267e0278-d333-41e8-82ef-f8c309749df8",
  "/",
);

if (!html.includes("LOCK='/'")) {
  throw new Error("served HTML missing LOCK=/ bootstrap");
}

console.log("✓ verify:preview-replace-state-root");
