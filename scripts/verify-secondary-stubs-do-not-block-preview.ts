#!/usr/bin/env npx tsx
/**
 * BidNest-scale fixture: secondary route stubs must not block preview startup.
 */
import { validateGeneratedApp } from "../src/lib/build/generated-app-validator";
import {
  applyTodoStubGate,
  detectTodoStubMatches,
  formatSecondaryStubQualityNote,
  hasBlockingTodoStubMatches,
  previewStubBlocksValidation,
} from "../src/lib/build/todo-stub-detector";
import { classifyPreviewBuildFailure } from "../src/lib/preview/preview-failure-classifier";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const secondaryStubPage = (route: string, label: string) => ({
  path: `app/${route}/page.tsx`,
  content: `export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">${label}</h1>
      <p>Placeholder route — content coming soon.</p>
    </main>
  );
}`,
});

const coreFiles = [
  {
    path: "package.json",
    content: JSON.stringify({
      name: "bidnest",
      dependencies: { react: "^18.0.0", "react-dom": "^18.0.0", next: "^14.0.0" },
      scripts: { dev: "next dev", build: "next build" },
    }),
  },
  {
    path: "app/layout.tsx",
    content: `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="min-h-screen bg-slate-950 text-white">{children}</body></html>;
}`,
  },
  {
    path: "app/page.tsx",
    content: `export default function Home() {
  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-3xl font-bold">BidNest Auctions</h1>
      <p className="mt-4 text-slate-300">Browse live auctions and place bids in real time.</p>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {["Vintage Watch", "Art Print", "Guitar"].map((item) => (
          <article key={item} className="rounded-xl border border-white/10 p-4">{item}</article>
        ))}
      </section>
    </main>
  );
}`,
  },
  ...[
    ["auctions", "Auctions"],
    ["bids", "My Bids"],
    ["watchlist", "Watchlist"],
    ["sell", "Sell Item"],
    ["profile", "Profile"],
    ["settings", "Settings"],
    ["notifications", "Notifications"],
    ["help", "Help"],
    ["terms", "Terms"],
    ["privacy", "Privacy"],
  ].map(([route, label]) => secondaryStubPage(route, label)),
  ...[
    ["categories", "Categories"],
    ["sellers", "Sellers"],
    ["messages", "Messages"],
    ["payments", "Payments"],
    ["analytics", "Analytics"],
  ].map(([route, label]) => ({
    path: `app/${route}/page.tsx`,
    content: `export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">${label}</h1>
      <section className="mt-4 grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <article key={i} className="rounded-lg border border-white/10 p-4">Live ${label} item {i + 1}</article>
        ))}
      </section>
    </main>
  );
}`,
  })),
];

// Pad to 62 files with non-route support files (components, lib, hooks)
const supportFiles = Array.from({ length: 62 - coreFiles.length }, (_, i) => ({
  path: `src/components/support/Widget${i + 1}.tsx`,
  content: `export function Widget${i + 1}() {
  return <div className="rounded-lg border border-white/10 p-4">Support widget ${i + 1}</div>;
}`,
}));

const bidNestFiles = [...coreFiles, ...supportFiles];
assert(bidNestFiles.length === 62, `expected 62 files, got ${bidNestFiles.length}`);

const routeCount = bidNestFiles.filter((f) => /(^|\/)page\.tsx$/i.test(f.path)).length;
assert(routeCount === 16, `expected 16 routes, got ${routeCount}`);

const scan = detectTodoStubMatches(bidNestFiles);
const secondaryStubs = scan.matches.filter((m) => m.detector === "secondary_route_stub");
assert(secondaryStubs.length === 10, `expected 10 secondary_route_stub matches, got ${secondaryStubs.length}`);
assert(
  secondaryStubs.every((m) => m.blocking === false),
  "all secondary_route_stub matches must be blocking:false",
);
assert(!hasBlockingTodoStubMatches(scan.matches), "no blocking stub matches");

const validation = validateGeneratedApp({
  files: bidNestFiles,
  projectId: "805a5955-fae9-4c39-8426-37037f421d83",
  ownerId: "user-1",
});
assert(validation.ok === true, "validator.ok must be true for BidNest-scale secondary stubs");
assert(validation.warnings.length > 0, "validator.warnings must include stub warnings");
assert(
  !validation.blockingReasons.some((r) => r.startsWith("todo_or_stub_page")),
  "no blocking todo_or_stub_page in blockingReasons",
);

const gate = applyTodoStubGate({
  files: bidNestFiles,
  fileCount: bidNestFiles.length,
  routeCount,
});
assert(gate.blockingReasons.length === 0, "applyTodoStubGate must not produce blocking reasons");
assert(!gate.scan.shouldBlockPreview, "shouldBlockPreview must be false");

const blockError = previewStubBlocksValidation({
  blockingReasons: validation.blockingReasons,
  todoStubMatches: validation.todoStubMatches,
});
assert(blockError === null, "previewStubBlocksValidation must return null");

const qualityNote = formatSecondaryStubQualityNote(validation.todoStubMatches);
assert(
  qualityNote?.includes("Some secondary pages are still simple placeholders") ?? false,
  "quality note must describe secondary placeholders",
);

const classified = classifyPreviewBuildFailure({
  appFilesCount: 62,
  routesCount: 16,
  packageJsonExists: true,
  entrypointExists: true,
  previewArtifactExists: false,
  buildLogs: null,
  userMessage: "todo_or_stub_page",
  previewStatus: "failed",
  previewBuildJobId: null,
  todoStubMatches: scan.matches,
});
assert(
  classified.failure_kind !== "preview_source_validation_failed",
  `must not classify as preview_source_validation_failed, got ${classified.failure_kind}`,
);
assert(
  classified.failure_kind === "preview_not_started_due_to_gate_bug",
  `expected preview_not_started_due_to_gate_bug for stale gate metadata, got ${classified.failure_kind}`,
);

console.log("verify:secondary-stubs-do-not-block-preview OK");
