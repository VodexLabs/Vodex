#!/usr/bin/env node
/**
 * Final runtime fix verification — build persist, paddle admin, resend, credits, chat, code tab.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
    return false;
  }
  console.log("OK:", msg);
  return true;
}

const checks = [
  () => {
    const p = read("src/lib/build/post-build-contract.ts");
    assert(/missing_blueprint_routes/.test(p), "blueprint routes non-blocking with saved files");
    const e = read("src/lib/build/execute-staged-build-job.ts");
    assert(e.includes("reconcilePostPersistBuildStatus"), "post-persist reconciler wired");
    assert(!e.includes("Credits were returned for this attempt"), "no refund copy in staged job failure block");
  },
  () => {
    assert(fs.existsSync("src/lib/build/post-persist-status-reconciler.ts"), "post-persist reconciler exists");
    assert(fs.existsSync("src/lib/build/blueprint-route-repair.ts"), "blueprint route repair exists");
  },
  () => {
    const w = read("src/components/create/workspace/immersive-workspace.tsx");
    assert(!w.includes('pathname.includes("/builder")\n        ? "code"'), "builder defaults to preview not code");
    assert(w.includes('setRightTab("preview")') && w.includes("onRepair"), "repair keeps preview tab");
  },
  () => {
    const r = read("src/components/repair/repair-center.tsx");
    assert(r.includes("Preview needs a technical fix"), "compact repair copy");
    assert(r.includes("compact ?") && !/compact \? null :[\s\S]*Estimated cost/.test(r), "cost jargon hidden when compact");
  },
  () => {
    const a = read("src/components/admin/admin-billing-panel.tsx");
    assert(!a.includes("Stripe setup required"), "no stripe platform panel");
    assert(a.includes("Paddle"), "paddle platform billing panel");
  },
  () => {
    assert(read("src/lib/email/resend-diagnostics.ts").includes("getResendDiagnostics"), "resend diagnostics");
    const route = read("src/app/api/admin/contact-requests/route.ts");
    assert(route.includes("getResendDiagnostics"), "contact route uses server diagnostics");
  },
  () => {
    const id = read("src/lib/identity/dreamos-identity.ts");
    assert(id.includes("creditsBonus"), "identity includes bonus");
    const card = read("src/components/identity/account-identity-card.tsx");
    assert(card.includes("bonus"), "account identity shows bonus");
    const admin = read("src/components/admin/admin-users-panel.tsx");
    assert(admin.includes("monthly_token_limit + Math.max(u.bonus_credits"), "admin users bonus denominator");
  },
  () => {
    const c = read("src/components/chat/chat-view.tsx");
    assert(c.includes("you can still chat"), "chat sidebar timeout does not block main chat");
    const conv = read("src/app/api/conversations/route.ts");
    assert(conv.includes('.is("project_id", null)'), "create conversations excluded");
  },
  () => {
    const h = read("src/hooks/use-project-files.ts");
    assert(h.includes("prefetchFileContent"), "project files prefetch content");
    const b = read("src/components/builder/app-builder-workspace.tsx");
    assert(b.includes("no saved content"), "empty file warning in code tab");
  },
];

for (const fn of checks) fn();

if (process.exitCode) process.exit(1);
console.log("\nAll runtime-fix-final checks passed.");
