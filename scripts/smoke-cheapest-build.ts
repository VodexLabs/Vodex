#!/usr/bin/env node
/**
 * Smoke test: cheapest model routing + build validation pipeline (offline).
 * Live API build: set RUN_LIVE_BUILD=1 BASE_URL=http://localhost:3000 + AUTH_COOKIE=...
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDeterministicBlueprint } from "../src/lib/build/blueprint-deterministic";
import { validateGeneratedBuild } from "../src/lib/creation/validate-build-quality";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

async function main() {
  const errors: string[] = [];

  const router = read("src/lib/ai/resolve-automatic-model.ts");
  if (!router.includes("gemini-flash")) {
    errors.push("cheapest automatic model should prefer gemini-flash when Google is configured");
  }

  const chat = read("src/app/api/chat/route.ts");
  if (!chat.includes("resolveStageModel")) {
    errors.push("chat route must use resolveStageModel for model routing");
  }

  const blueprint = buildDeterministicBlueprint({
    prompt: "Build a simple task list app with add, complete, and delete",
    templateId: "saas-dashboard",
    stylePresetId: "modern",
    modelId: "gemini-flash",
    qualityLevel: "quick",
  });

  const minimalGoodFiles = [
    {
      path: "preview/index.html",
      content: `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>TaskFlow</title><link rel="stylesheet" href="styles.css"/></head><body><main id="app"><h1>Tasks</h1><ul id="list"></ul><form id="add"><input id="text" placeholder="New task"/><button type="submit">Add</button></form></main><script src="app.js"></script></body></html>`,
    },
    {
      path: "styles.css",
      content: `*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#0f1115;color:#f4f7fd}main{max-width:480px;margin:2rem auto;padding:1.5rem;border-radius:16px;background:#1a1f2b}input,button{padding:.6rem .8rem;border-radius:10px;border:none}button{background:#6366f1;color:#fff;font-weight:600}`,
    },
    {
      path: "app.js",
      content: `const list=document.getElementById('list');const form=document.getElementById('add');const text=document.getElementById('text');const tasks=JSON.parse(localStorage.getItem('tasks')||'[]');function render(){list.innerHTML=tasks.map((t,i)=>'<li>'+t+' <button data-i="'+i+'">Done</button></li>').join('');}form.addEventListener('submit',e=>{e.preventDefault();const v=text.value.trim();if(!v)return;tasks.push(v);localStorage.setItem('tasks',JSON.stringify(tasks));text.value='';render();});list.addEventListener('click',e=>{if(e.target.dataset.i){tasks.splice(Number(e.target.dataset.i),1);localStorage.setItem('tasks',JSON.stringify(tasks));render();}});render();`,
    },
  ];

  const quality = validateGeneratedBuild(minimalGoodFiles);
  if (!quality.ok) {
    errors.push(`validateGeneratedBuild failed: ${quality.reasons?.join("; ") ?? "unknown"}`);
  }

  const live = process.env.RUN_LIVE_BUILD === "1";
  const base = process.env.BASE_URL ?? "http://localhost:3000";
  const cookie = process.env.AUTH_COOKIE ?? "";

  if (live) {
    if (!cookie) {
      errors.push("RUN_LIVE_BUILD=1 requires AUTH_COOKIE from browser devtools");
    } else {
      console.log("Live build: POST /api/chat (gemini-flash, async build)…");
      const res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          "X-DreamOS-Async-Build": "1",
        },
        body: JSON.stringify({
          messages: [
            {
              id: "u1",
              role: "user",
              parts: [
                {
                  type: "text",
                  text: "Build a minimal task list app with add and complete. Keep it simple.",
                },
              ],
            },
          ],
          mode: "build",
          modelId: "gemini-flash",
          strategy: "build_now",
          forceBuildPipeline: true,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        errors.push(`live build HTTP ${res.status}: ${text.slice(0, 400)}`);
      } else {
        let json: { asyncBuild?: boolean; buildJobId?: string; operationId?: string } | undefined;
        try {
          json = JSON.parse(text) as typeof json;
        } catch {
          errors.push("live build: response not JSON (stream endpoint?)");
        }
        if (json && !json.asyncBuild && !json.buildJobId) {
          errors.push(`live build: unexpected response ${text.slice(0, 200)}`);
        } else {
          console.log("Live build queued:", json?.buildJobId ?? json?.operationId ?? "ok");
        }
      }
    }
  } else {
    console.log(
      "(Skipping live API — set RUN_LIVE_BUILD=1 AUTH_COOKIE=... to test against dev server)",
    );
  }

  const tsc = spawnSync("npm", ["run", "typecheck"], { cwd: ROOT, shell: true, stdio: "inherit" });
  if (tsc.status !== 0) errors.push("typecheck failed");

  if (errors.length) {
    console.error("\nsmoke-cheapest-build FAILED\n");
    errors.forEach((e) => console.error(" -", e));
    process.exit(1);
  }

  console.log("\nsmoke-cheapest-build OK");
  console.log("  Cheapest route: gemini-flash (when Google key present)");
  console.log("  Offline UI sample passed validateGeneratedBuild");
  console.log("  Blueprint archetype:", blueprint?.pages?.length ?? "n/a", "pages");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
