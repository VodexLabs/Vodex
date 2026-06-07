import fs from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "artifacts", "benchmarks", "p13");

export type P138StepResult = {
  id: string;
  pass: boolean;
  detail?: string;
  screenshot?: string;
  root_cause?: string;
};

export type P138Artifact = {
  executed: boolean;
  pass: boolean;
  timestamp: string;
  project_id: string | null;
  screenshots: string[];
  steps: P138StepResult[];
  failed_step: string | null;
  root_cause: string | null;
  auth_debug_events?: unknown[];
};

function ensureDir() {
  fs.mkdirSync(outDir, { recursive: true });
}

export function writeP138Artifact(filename: string, artifact: P138Artifact) {
  ensureDir();
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2));
  return filePath;
}

export function finalizeArtifact(
  steps: P138StepResult[],
  projectId: string | null,
  extras?: Partial<Pick<P138Artifact, "auth_debug_events">>,
): P138Artifact {
  const failed = steps.find((s) => !s.pass);
  return {
    executed: true,
    pass: steps.every((s) => s.pass),
    timestamp: new Date().toISOString(),
    project_id: projectId,
    screenshots: steps.map((s) => s.screenshot).filter((s): s is string => Boolean(s)),
    steps,
    failed_step: failed?.id ?? null,
    root_cause: failed?.root_cause ?? failed?.detail ?? null,
    ...extras,
  };
}
