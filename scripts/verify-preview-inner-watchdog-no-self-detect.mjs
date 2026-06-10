#!/usr/bin/env node
/**
 * Watchdog must scan visible text only — not its own injected script source.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const watchdog = read("src/lib/preview/inject-preview-inner-watchdog.ts");
const shim = read("src/lib/preview/inject-preview-virtual-history.ts");
const rewrite = read("src/lib/preview/rewrite-preview-artifact-html.ts");

assert(watchdog.includes("cloneNode"), "watchdog must clone body");
assert(watchdog.includes("data-vodex-preview-watchdog"), "watchdog strips injected nodes");
assert(watchdog.includes("data-vodex-preview-shim"), "watchdog strips shim nodes");
assert(watchdog.includes("innerText"), "watchdog uses visible text");
assert(watchdog.includes('data-vodex-preview-watchdog="true"'), "watchdog marks injected script");
assert(!watchdog.includes("document.body.innerText||document.body.textContent"), "must not read raw body textContent");
assert(watchdog.includes("could not be found in this application"), "Next 404 phrase");
assert(shim.includes('data-vodex-preview-shim="true"'), "virtual history shim marked");
assert(rewrite.includes("injectPreviewInnerWatchdog"), "rewrite injects watchdog");

console.log("verify:preview-inner-watchdog-no-self-detect OK");
